// src/server/listsManagementHandlers.js
import prismaClientPkg from '@prisma/client'; // Default import
const { PrismaClient, RecordStatus } = prismaClientPkg; // Destructure needed parts
import { regeneratePlayerStats } from './statsGeneration.js'; // Ensure this path is correct

const prisma = new PrismaClient();

// Helper to find users who beat specific levels
async function findUsersWithRecordsForLevels(levelIds) {
    if (!levelIds || levelIds.length === 0) return [];
    try {
        const records = await prisma.personalRecord.findMany({
            where: {
                levelId: { in: levelIds },
                // Use the enum value
                status: RecordStatus.APPROVED, // Assuming your enum is RecordStatus.APPROVED
                // If your enum was PersonalRecordProgressStatus.COMPLETED, use that instead:
                // status: PersonalRecordProgressStatus.COMPLETED,
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
  // Ensure levelId is parsed correctly, handle potential empty string or null
  const parsedLevelId = levelData.levelId ? parseInt(levelData.levelId, 10) : null;

  if (isNaN(parsedPlacement) || parsedPlacement < 1 || (levelData.levelId && isNaN(parsedLevelId))) {
      return res.status(400).json({ message: 'Invalid placement or Level ID format.' });
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
            name: levelData.name,
            creator: levelData.creator,
            verifier: levelData.verifier,
            videoId: levelData.videoId,
            levelId: parsedLevelId, // Use the parsed ID (can be null)
            placement: parsedPlacement,
            list,
            description: levelData.description || "", // Add default empty string if needed
            tags: levelData.tags || [], // Add default empty array if needed
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
             userIdsToUpdate = await findUsersWithRecordsForLevels(affectedLevelIds);
        }

        return createdLevel;
    });

    // Trigger regeneration AFTER transaction succeeds
    await regeneratePlayerStats(affectsNumberOne ? userIdsToUpdate : null);

    return res.status(201).json(newLevel);
  } catch (error) {
    console.error("Failed to add level to list:", error);
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
    const originalLevel = await prisma.level.findUnique({
        where: { id: levelId },
        select: { name: true, placement: true, list: true } // Need placement and list too
    });
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
        description: levelData.description, // Include other fields as needed
        tags: levelData.tags,
      },
    });

    // Check if the name changed and if it was the hardest for anyone
    if (originalLevel.name !== updatedLevel.name && originalLevel.list === 'main-list') {
        console.log(`Level name changed (${originalLevel.name} -> ${updatedLevel.name}). Finding potentially affected users.`);
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
    const idFromRequest = req.params?.levelId || req.query?.levelId || levelId;

    if (!idFromRequest) { return res.status(400).json({ message: 'Level ID is required.' }); }
    try {
        const history = await prisma.listChange.findMany({
            where: { levelId: idFromRequest },
            orderBy: { createdAt: 'desc' },
        });
        if (history.length === 0) {
             const levelExists = await prisma.level.findUnique({ where: { id: idFromRequest } });
             if (!levelExists) return res.status(404).json({ message: 'Level not found.' });
        }
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
    const targetDate = new Date(`${date}T23:59:59.999Z`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date value.' });
    }

    console.warn("Historic list reconstruction using backward undo is complex and may have inaccuracies regarding placement shifts. Consider a forward replay model for full accuracy.");

    const currentLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      orderBy: { placement: 'asc' },
    });
    const levelsMap = new Map(currentLevels.map(level => [level.id, { ...level }]));

    const changesToUndo = await prisma.listChange.findMany({
      where: {
        list: 'main-list',
        createdAt: { gt: targetDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const placementShifts = {};

    for (const change of changesToUndo) {
        // ... (Simplified undo logic from previous step - acknowledge potential inaccuracies) ...
         if (change.type === 'ADD') {
            const levelAdded = levelsMap.get(change.levelId);
            if (levelAdded) {
                for (let i = levelAdded.placement + 1; ; i++) {
                    placementShifts[i] = (placementShifts[i] || 0) - 1;
                    if (!currentLevels.some(l => l.placement === i && levelsMap.has(l.id))) break;
                }
                levelsMap.delete(change.levelId);
            }
        }
        else if (change.type === 'REMOVE') {
            const match = change.description.match(/(.+) removed from .+ \(was #(\d+)\)/);
            if (match) {
                const [, levelName, oldPlacementStr] = match;
                const oldPlacement = parseInt(oldPlacementStr);
                levelsMap.set(change.levelId, {
                    id: change.levelId, name: levelName || 'Unknown (Historic)', placement: oldPlacement,
                    list: 'main-list', creator: 'N/A (Historic)', verifier: 'N/A',
                    videoId: '', levelId: 0, description: '', tags: []
                });
                for (let i = oldPlacement + 1; ; i++) {
                    placementShifts[i] = (placementShifts[i] || 0) + 1;
                     if (!currentLevels.some(l => l.placement === i - 1 && levelsMap.has(l.id))) break;
                }
            }
        }
        else if (change.type === 'MOVE') {
            const match = change.description.match(/moved from #(\d+) to #(\d+)/);
            const levelData = levelsMap.get(change.levelId);
            if (match && levelData) {
                const oldP = parseInt(match[1]);
                const newP = parseInt(match[2]);
                levelData.placement = oldP;
                if (oldP > newP) {
                    for(let i = newP; i < oldP; i++) {
                        placementShifts[i] = (placementShifts[i] || 0) - 1;
                    }
                } else {
                    for(let i = oldP + 1; i <= newP; i++) {
                         placementShifts[i] = (placementShifts[i] || 0) + 1;
                    }
                }
            }
        }
    }

    levelsMap.forEach(level => {
        level.placement += (placementShifts[level.placement] || 0);
    });

    let finalHistoricList = Array.from(levelsMap.values())
                                  .sort((a, b) => a.placement - b.placement);

    finalHistoricList.forEach((level, index) => {
      level.placement = index + 1;
    });
    finalHistoricList = finalHistoricList.filter(level => level.placement > 0);

    return res.status(200).json(finalHistoricList);

  } catch (error) {
    console.error("Failed to get historic list:", error);
    return res.status(500).json({ message: 'Failed to retrieve historic list data.' });
  }
}