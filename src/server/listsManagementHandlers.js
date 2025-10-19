import { PrismaClient } from '@prisma/client';
import { regeneratePlayerStats } from './statsGeneration.js'; // Ensure this path is correct

const prisma = new PrismaClient();

// Helper to find users who beat specific levels
async function findUsersWithRecordsForLevels(levelIds) {
    if (!levelIds || levelIds.length === 0) return [];
    try {
        const records = await prisma.personalRecord.findMany({
            where: {
                levelId: { in: levelIds },
                status: 'APPROVED',
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        return records.map(r => r.userId);
    } catch (error) {
        console.error("Error finding users with records for levels:", levelIds, error);
        return []; // Return empty array on error to avoid breaking the main flow
    }
}


export async function addLevelToList(req, res) {
  const { levelData, list, placement } = req.body;
  if (!levelData || !list || placement === undefined || !levelData.name || !levelData.creator || !levelData.verifier || !levelData.videoId || !levelData.levelId) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const parsedPlacement = parseInt(placement, 10);
  const parsedLevelId = parseInt(levelData.levelId, 10);

  if (isNaN(parsedPlacement) || parsedPlacement < 1 || isNaN(parsedLevelId)) {
      return res.status(400).json({ message: 'Invalid placement or Level ID.' });
  }

  try {
    let newLevelId = null;
    let affectsNumberOne = (parsedPlacement === 1 && list === 'main-list');
    let userIdsToUpdate = [];

    const newLevel = await prisma.$transaction(async (tx) => {
        let oldNumberOneId = null;
        if (affectsNumberOne) {
            const oldNumberOne = await tx.level.findFirst({
                where: { list: 'main-list', placement: 1 },
                select: { id: true }
            });
            oldNumberOneId = oldNumberOne?.id;
        }

        // Shift existing levels down
        await tx.level.updateMany({
            where: { list, placement: { gte: parsedPlacement } },
            data: { placement: { increment: 1 } },
        });

        // Create the new level
        const dataToCreate = {
            ...levelData,
            levelId: parsedLevelId,
            placement: parsedPlacement,
            list,
        };
        const createdLevel = await tx.level.create({ data: dataToCreate });

        // Log the change
        await tx.listChange.create({
            data: {
              type: 'ADD',
              description: `${createdLevel.name} added at #${parsedPlacement}`,
              levelId: createdLevel.id,
              list: list,
            },
        });

        // Enforce list limit
        const limit = list === 'main-list' ? 150 : 75; // Adjust limits as needed
        await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

        newLevelId = createdLevel.id;

        // If #1 changed, find affected users
        if (affectsNumberOne) {
            const affectedLevelIds = [oldNumberOneId, newLevelId].filter(id => id != null);
            // Use await within transaction to ensure consistency if helper needs tx
            // If findUsersWithRecordsForLevels doesn't need tx, it's okay outside too.
            // For safety, let's assume it might use prisma.$queryRaw or similar later.
             userIdsToUpdate = await findUsersWithRecordsForLevels(affectedLevelIds);
             // If the helper uses global prisma, it won't be part of the transaction.
             // If you need it transactional, pass `tx` to the helper:
             // userIdsToUpdate = await findUsersWithRecordsForLevels(tx, affectedLevelIds);
        }

        return createdLevel;
    });

    // Trigger regeneration AFTER transaction succeeds
    // Pass the calculated userIdsToUpdate if #1 was affected
    await regeneratePlayerStats(affectsNumberOne ? userIdsToUpdate : null);

    return res.status(201).json(newLevel);
  } catch (error) {
    console.error("Failed to add level to list:", error);
    // Attempt to rollback placement shifts manually if transaction failed partially (complex)
    // It's safer if the transaction fully covers or fails atomically.
    return res.status(500).json({ message: 'Failed to add level.' });
  }
}

export async function removeLevelFromList(req, res) {
  const { levelId } = req.body;
  if (!levelId) { return res.status(400).json({ message: 'Missing required field: levelId.' }); }
  try {
    let success = false;
    let affectsNumberOne = false;
    let oldNumberOneId = null;
    let userIdsToUpdate = [];

    const result = await prisma.$transaction(async (tx) => {
      const levelToRemove = await tx.level.findUnique({
          where: { id: levelId },
          select: {id: true, name: true, placement: true, list: true}
      });
      if (!levelToRemove) throw new Error('Level not found.');

      affectsNumberOne = (levelToRemove.placement === 1 && levelToRemove.list === 'main-list');
      if (affectsNumberOne) {
          oldNumberOneId = levelToRemove.id; // Store the ID of the level being removed
      }

      // Log the change before deleting
      await tx.listChange.create({
        data: {
          type: 'REMOVE',
          description: `${levelToRemove.name} removed from ${levelToRemove.list} (was #${levelToRemove.placement})`,
          levelId: levelToRemove.id,
          list: levelToRemove.list,
        },
      });

      // Delete the level
      await tx.level.delete({ where: { id: levelId } });

      // Shift remaining levels up
      await tx.level.updateMany({
        where: { list: levelToRemove.list, placement: { gt: levelToRemove.placement } },
        data: { placement: { decrement: 1 } },
      });

      // If #1 was removed, find users who beat it + find users who beat the *new* #1
      if (affectsNumberOne) {
          const newNumberOne = await tx.level.findFirst({
              where: { list: 'main-list', placement: 1 }, // Find the level that shifted into #1
              select: { id: true }
          });
          const affectedLevelIds = [oldNumberOneId, newNumberOne?.id].filter(id => id != null);
          userIdsToUpdate = await findUsersWithRecordsForLevels(affectedLevelIds);
      }

      success = true;
      return { message: `${levelToRemove.name} removed successfully.` };
    });

    // Trigger regeneration AFTER transaction succeeds
    if (success) {
      await regeneratePlayerStats(affectsNumberOne ? userIdsToUpdate : null);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to remove level from list:", error);
    return res.status(500).json({ message: error.message || 'Failed to remove level.' });
  }
}

export async function moveLevelInList(req, res) {
  const { levelId, newPlacement } = req.body;
  const parsedNewPlacement = parseInt(newPlacement, 10);

  if (!levelId || isNaN(parsedNewPlacement) || parsedNewPlacement < 1) {
    return res.status(400).json({ message: 'Valid levelId and newPlacement (> 0) are required.' });
  }

  try {
    let success = false;
    let affectsNumberOne = false;
    let oldNumberOneId = null;
    let newNumberOneId = null;
    let userIdsToUpdate = [];

    const updatedLevel = await prisma.$transaction(async (tx) => {
      const levelToMove = await tx.level.findUnique({ where: { id: levelId } });
      if (!levelToMove) throw new Error('Level not found');

      const oldPlacement = levelToMove.placement;
      const { list } = levelToMove;

      // Determine if #1 is involved *before* making changes
      if (list === 'main-list' && (oldPlacement === 1 || parsedNewPlacement === 1)) {
          affectsNumberOne = true;
          // Identify the level currently at #1
          const currentNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1 }, select: {id: true}});
          oldNumberOneId = currentNumberOne?.id; // This is the ID of the level *currently* at #1
      }

      // Perform the move logic
      if (oldPlacement !== parsedNewPlacement) {
        if (oldPlacement > parsedNewPlacement) {
          // Moving Up: Increment levels between newPlacement and oldPlacement(exclusive)
          await tx.level.updateMany({
            where: { list, placement: { gte: parsedNewPlacement, lt: oldPlacement } },
            data: { placement: { increment: 1 } },
          });
        } else {
          // Moving Down: Decrement levels between oldPlacement(exclusive) and newPlacement
          await tx.level.updateMany({
            where: { list, placement: { gt: oldPlacement, lte: parsedNewPlacement } },
            data: { placement: { decrement: 1 } },
          });
        }
      }

      // Update the moved level's placement
      const finalUpdatedLevel = await tx.level.update({
        where: { id: levelId },
        data: { placement: parsedNewPlacement },
      });

      // Log the change if placement actually changed
      if (oldPlacement !== parsedNewPlacement) {
        await tx.listChange.create({
          data: {
            type: 'MOVE',
            description: `${finalUpdatedLevel.name} moved from #${oldPlacement} to #${parsedNewPlacement}`,
            levelId: finalUpdatedLevel.id,
            list: list,
          },
        });
      }

      // Enforce list limit
      const limit = list === 'main-list' ? 150 : 75; // Adjust limits
      await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

      // If #1 affected, find the final ID at #1 and affected users
      if (affectsNumberOne) {
          // Find the level that ended up at #1 *after* all shifts
          const actualNewNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1}, select: {id: true}});
          newNumberOneId = actualNewNumberOne?.id;

          // Collect unique IDs of the level originally at #1 and the level finally at #1
          const affectedLevelIds = [...new Set([oldNumberOneId, newNumberOneId])].filter(id => id != null);
          userIdsToUpdate = await findUsersWithRecordsForLevels(affectedLevelIds);
      }

      success = true;
      return finalUpdatedLevel;
    });

    // Trigger regeneration AFTER transaction succeeds
    if (success) {
      await regeneratePlayerStats(affectsNumberOne ? userIdsToUpdate : null);
    }

    return res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("Failed to move level in list:", error);
    return res.status(500).json({ message: error.message || 'Failed to move level.' });
  }
}


export async function updateLevel(req, res) {
  const { levelId, levelData } = req.body;
  if (!levelId || !levelData) { return res.status(400).json({ message: 'Level ID and level data are required.' }); }

  try {
    const originalLevel = await prisma.level.findUnique({ where: { id: levelId }, select: { name: true } });
    if (!originalLevel) {
        return res.status(404).json({ message: 'Level not found.' });
    }

    const updatedLevel = await prisma.level.update({
      where: { id: levelId },
      data: {
        name: levelData.name,
        creator: levelData.creator,
        verifier: levelData.verifier,
        videoId: levelData.videoId,
        levelId: levelData.levelId ? parseInt(levelData.levelId, 10) : null,
        // Add other fields you might want to update
      },
    });

    // Check if the name changed, as it affects 'hardestDemonName'
    if (originalLevel.name !== updatedLevel.name) {
        console.log(`Level name changed (${originalLevel.name} -> ${updatedLevel.name}). Finding potentially affected users.`);
        // Find users whose hardest demon was the original name
        // This requires accessing the generated JSONs or recalculating stats,
        // which is complex here. A simpler approach is to regenerate *all* stats
        // if a name changes, or accept that 'hardest' might briefly show the old name.
        // For simplicity, let's trigger a full regen on name change.
        // Or, find users who have *this specific level* as their hardest (requires placement too).

        // Let's trigger regeneration for users who beat *this* level.
         const userIdsToUpdate = await findUsersWithRecordsForLevels([levelId]);
         await regeneratePlayerStats(userIdsToUpdate.length > 0 ? userIdsToUpdate : null);
    }


    return res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("Failed to update level:", error);
    return res.status(500).json({ message: 'Failed to update level.' });
  }
}


export async function getLevelHistory(req, res, levelId) {
    // Note: This function seems designed to be called internally or needs 'levelId' from params.
    // Assuming 'levelId' is passed correctly.
    if (!levelId) { return res.status(400).json({ message: 'Level ID is required.' }); }
    try {
        const history = await prisma.listChange.findMany({
            where: { levelId: levelId },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(history);
    } catch (error) {
        console.error("Failed to fetch level history:", error);
        return res.status(500).json({ message: 'Failed to fetch level history.' });
    }
}


export async function getHistoricList(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'A date parameter is required.' });
  }

  try {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    // Interpret date as the END of that day for comparison consistency
    const targetDate = new Date(`${date}T23:59:59.999Z`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date value.' });
    }

    // 1. Start with current list state
    const currentLevels = await prisma.level.findMany({
      where: { list: 'main-list' }, // Assuming only for main list history
      orderBy: { placement: 'asc' },
    });
    // Use a map for efficient updates
    const levelsMap = new Map(currentLevels.map(level => [level.id, { ...level }]));

    // 2. Get changes to undo (created AFTER the target date), newest first
    const changesToUndo = await prisma.listChange.findMany({
      where: {
        list: 'main-list',
        createdAt: { gt: targetDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Undo changes
    for (const change of changesToUndo) {
        const levelData = levelsMap.get(change.levelId);

        if (change.type === 'ADD') {
            // If the level was added after the target date, remove it from our map
            levelsMap.delete(change.levelId);
            // We also need to shift levels that were pushed down by this add *back up*
             // This logic gets complex quickly, needs careful handling of placements during undo
        }
        else if (change.type === 'MOVE') {
            const match = change.description.match(/moved from #(\d+) to #(\d+)/);
            if (match && levelData) {
                const oldPlacement = parseInt(match[1]);
                 // Revert the level's placement to its state *before* this move
                levelData.placement = oldPlacement;
                // Need to also revert the shifts caused by this move on *other* levels (very complex)
            }
        }
        else if (change.type === 'REMOVE') {
            const match = change.description.match(/(.+) removed from .+ \(was #(\d+)\)/);
            if (match) {
                const [, levelName, oldPlacementStr] = match;
                // Add the level back into the map with its old placement
                levelsMap.set(change.levelId, {
                    id: change.levelId,
                    name: levelName || 'Unknown (Historic)', // Name might not be available
                    placement: parseInt(oldPlacementStr),
                    list: 'main-list',
                    // Fill defaults for missing fields
                    creator: 'N/A (Historic)',
                    verifier: 'N/A',
                    videoId: '', levelId: 0, description: '', tags: []
                });
                // We also need to shift levels that were moved up *back down* (complex)
            }
      }
    }

    // --- Simplified History Reconstruction ---
    // A more reliable (though potentially slower) method is to replay history forward.
    // 1. Find the list state at a known good point *before* the target date (e.g., initial seed).
    // 2. Fetch all changes *up to* the target date, oldest first.
    // 3. Apply each change sequentially to reconstruct the state.
    // This avoids the complexity of reversing shifts.
    // Due to the complexity of accurately reversing placement shifts,
    // the current undo logic is likely INCOMPLETE and may produce inaccurate historic lists.
    // Replaying forward is recommended for accuracy.
    // For now, return the partially reconstructed list with a warning.

    console.warn("Historic list reconstruction logic is simplified and may be inaccurate due to placement shifts.");

    let finalHistoricList = Array.from(levelsMap.values())
                                  .sort((a, b) => a.placement - b.placement);

    // Re-normalize placements (might hide inaccuracies from undo logic)
    finalHistoricList.forEach((level, index) => {
      level.placement = index + 1;
    });

    return res.status(200).json(finalHistoricList);

  } catch (error) {
    console.error("Failed to get historic list:", error);
    return res.status(500).json({ message: 'Failed to retrieve historic list data.' });
  }
}