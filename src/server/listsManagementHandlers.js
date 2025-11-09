// src/server/listsManagementHandlers.js
import prismaClientPkg from '@prisma/client';
// Ensure you import the correct enum for record status from YOUR schema
// Using PersonalRecordProgressStatus based on your schema
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;
// [FIX] Removed the broken import below, as statsGeneration.js is a standalone script
// import { regeneratePlayerStats } from './statsGeneration.js'; // Ensure this path is correct

const prisma = new PrismaClient();

// [NEW] Function to add a record to a level by an admin
export async function addRecordToList(req, res) {
  const { levelId, username, percent, videoId } = req.body;

  if (!levelId || !username || !percent || !videoId) {
    return res.status(400).json({ message: 'Missing required fields: levelId, username, percent, videoId.' });
  }

  const parsedPercent = parseInt(percent, 10);
  if (isNaN(parsedPercent) || parsedPercent < 1 || parsedPercent > 100) {
    return res.status(400).json({ message: 'Percent must be a number between 1 and 100.' });
  }

  try {
    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      return res.status(404).json({ message: 'Level not found.' });
    }

    // Check if this exact record already exists to prevent duplicates
    // Note: This check is case-sensitive for username
    const recordExists = level.records.some(
      record => record.username === username && record.percent === parsedPercent
    );

    if (recordExists) {
      return res.status(409).json({ message: 'This exact record (player and percent) already exists on this level.' });
    }

    // Add the new record using Prisma's push for MongoDB
    const updatedLevel = await prisma.level.update({
      where: { id: levelId },
      data: {
        records: {
          push: {
            username,
            percent: parsedPercent,
            videoId
          }
        }
      }
    });

    console.log(`[Admin AddRecord] Added record for ${username} (${parsedPercent}%) on level ${levelId}`);
    
    // Also log this as a list change
    await prisma.listChange.create({
        data: {
          type: 'MOVE', // Using 'MOVE' as a generic "modification" type
          description: `Admin added record: ${username} (${parsedPercent}%)`,
          levelId: levelId,
          list: level.list,
        },
    });
    
    return res.status(200).json(updatedLevel); // Return the updated level

  } catch (error) {
    console.error("[Admin AddRecord] Failed to add record:", error);
    return res.status(500).json({ message: 'Failed to add record.' });
  }
}

// [NEW] Function to remove a record from a level by an admin
export async function removeRecordFromList(req, res) {
  const { levelId, recordVideoId } = req.body;

  if (!levelId || !recordVideoId) {
    return res.status(400).json({ message: 'Missing required fields: levelId and recordVideoId.' });
  }

  try {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: { records: true, list: true }
    });

    if (!level) {
      return res.status(404).json({ message: 'Level not found.' });
    }

    const recordToRemove = level.records.find(r => r.videoId === recordVideoId);
    if (!recordToRemove) {
      return res.status(404).json({ message: 'Record with that video ID not found on this level.' });
    }

    // Filter out the record to remove
    const updatedRecords = level.records.filter(
      record => record.videoId !== recordVideoId
    );

    // Update the level with the new, filtered records array
    await prisma.level.update({
      where: { id: levelId },
      data: {
        records: updatedRecords
      }
    });

    console.log(`[Admin RemoveRecord] Removed record for ${recordToRemove.username} (${recordToRemove.percent}%) from level ${levelId}`);

    // Log this change
    await prisma.listChange.create({
        data: {
          type: 'MOVE', // Using 'MOVE' as a generic "modification" type
          description: `Admin removed record: ${recordToRemove.username} (${recordToRemove.percent}%)`,
          levelId: levelId,
          list: level.list,
        },
    });

    return res.status(200).json({ message: 'Record removed successfully.' });

  } catch (error) {
    console.error("[Admin RemoveRecord] Failed to remove record:", error);
    return res.status(500).json({ message: 'Failed to remove record.' });
  }
}


// Helper to find player names involved with specific levels (verifier or in records)
async function findPlayersInvolvedWithLevels(levelIds) {
    // Return early if no valid IDs are provided
    if (!levelIds || !Array.isArray(levelIds) || levelIds.length === 0) {
        console.log("[Helper] findPlayersInvolvedWithLevels received no valid level IDs.");
        return [];
    }
    try {
        console.log(`[Helper] Finding players involved with level IDs: ${levelIds.join(', ')}`);
        const levels = await prisma.level.findMany({
            where: {
                id: { in: levelIds },
                list: 'main-list' // Only consider main list levels for stat impact
            },
            select: {
                verifier: true,
                records: { // Select records array which contains { username, percent, videoId }
                    select: {
                        username: true,
                        percent: true
                    }
                }
            },
        });

        const playerNames = new Set();
        levels.forEach(level => {
            if (level.verifier) {
                playerNames.add(level.verifier);
                // console.log(`[Helper] Added verifier: ${level.verifier}`);
            }
            if (Array.isArray(level.records)) {
                level.records.forEach(record => {
                    // Check if record has a username and completion is 100%
                    if (record.username && record.percent === 100) {
                        playerNames.add(record.username);
                        // console.log(`[Helper] Added record holder: ${record.username}`);
                    }
                });
            }
        });

        const namesArray = Array.from(playerNames);
        console.log(`[Helper] Found involved players: ${namesArray.join(', ') || 'None'}`);
        return namesArray;
    } catch (error) {
        console.error("[Helper] Error finding players involved with levels:", levelIds, error);
        return []; // Return empty array on error
    }
}


export async function addLevelToList(req, res) {
  const { levelData, list, placement } = req.body;
  // Basic validation
  if (!levelData || !list || placement === undefined || !levelData.name || !levelData.creator || !levelData.verifier || !levelData.videoId ) {
    return res.status(400).json({ message: 'Missing required fields for levelData (name, creator, verifier, videoId) or list/placement.' });
  }

  const parsedPlacement = parseInt(placement, 10);
  // Allow levelId to be optional or potentially null/empty string
  const parsedLevelId = (levelData.levelId && String(levelData.levelId).trim() !== '') ? parseInt(levelData.levelId, 10) : null;

  if (isNaN(parsedPlacement) || parsedPlacement < 1 || (levelData.levelId && String(levelData.levelId).trim() !== '' && isNaN(parsedLevelId))) {
      return res.status(400).json({ message: 'Invalid placement number or Level ID format (must be a number if provided).' });
  }


  try {
    let newLevelId = null;
    let affectsNumberOne = (parsedPlacement === 1 && list === 'main-list');
    let playerNamesToUpdate = []; // Store names now

    const newLevel = await prisma.$transaction(async (tx) => {
        let oldNumberOneId = null;
        if (affectsNumberOne) {
            const oldNumberOne = await tx.level.findFirst({
                where: { list: 'main-list', placement: 1 },
                select: { id: true }
            });
            oldNumberOneId = oldNumberOne?.id;
            console.log(`[AddLevel] #1 is affected. Old #1 ID: ${oldNumberOneId}`);
        }

        // Shift existing levels down
        console.log(`[AddLevel] Shifting levels down from placement ${parsedPlacement} in list ${list}`);
        await tx.level.updateMany({
            where: { list, placement: { gte: parsedPlacement } },
            data: { placement: { increment: 1 } },
        });

        // Create the new level data object
        const dataToCreate = {
            name: levelData.name,
            creator: levelData.creator,
            verifier: levelData.verifier,
            videoId: levelData.videoId,
            levelId: parsedLevelId, // Use the parsed ID (can be null)
            placement: parsedPlacement,
            list,
            description: levelData.description || "",
            records: levelData.records || [], // Initialize records if needed
            tags: levelData.tags || [],
        };

        console.log(`[AddLevel] Creating new level: ${dataToCreate.name} at #${parsedPlacement}`);
        const createdLevel = await tx.level.create({ data: dataToCreate });
        newLevelId = createdLevel.id; // Store the new level's ID

        // Log the change
        await tx.listChange.create({
            data: {
              type: 'ADD',
              description: `${createdLevel.name} added at #${parsedPlacement}`,
              levelId: createdLevel.id,
              list: list,
            },
        });
        console.log(`[AddLevel] Logged addition of ${createdLevel.name}`);


        // Enforce list limit
        const limit = list === 'main-list' ? 150 : 75; // Adjust limits as needed
        console.log(`[AddLevel] Enforcing list limit (${limit}) for ${list}`);
        const deletedLevels = await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });
        if(deletedLevels.count > 0) {
            console.log(`[AddLevel] Removed ${deletedLevels.count} levels exceeding limit.`);
        }


        // [FIX] This helper is fine to run, as it just queries the DB
        if (affectsNumberOne) {
            const affectedLevelIds = [oldNumberOneId, newLevelId].filter(id => id != null);
            console.log(`[AddLevel] Finding players involved with affected #1 levels: ${affectedLevelIds.join(', ')}`);
            playerNamesToUpdate = await findPlayersInvolvedWithLevels(affectedLevelIds);
        }

        return createdLevel; // Return the created level from transaction
    });

    // [FIX] Removed the call to regeneratePlayerStats.
    // The admin should run the 'npm run generate-stats' script manually after making changes.
    console.log(`[AddLevel] Transaction successful.`);

    return res.status(201).json(newLevel);
  } catch (error) {
    console.error("[AddLevel] Failed to add level to list:", error);
    return res.status(500).json({ message: 'Failed to add level. ' + (error.message || '') });
  }
}

export async function removeLevelFromList(req, res) {
  const { levelId } = req.body;
  if (!levelId) { return res.status(400).json({ message: 'Missing required field: levelId.' }); }
  try {
    let success = false;
    let affectsNumberOne = false;
    let levelBeingRemovedId = null;
    let levelBeingRemovedInfo = null; // Store verifier/records before deleting
    let playerNamesToUpdate = [];

    const result = await prisma.$transaction(async (tx) => {
      // Fetch level info *before* deleting
      levelBeingRemovedInfo = await tx.level.findUnique({
          where: { id: levelId },
          // Select all fields needed for finding players later AND for logging
          select: {id: true, name: true, placement: true, list: true, verifier: true, records: true} // Fetch full records array
      });
      if (!levelBeingRemovedInfo) throw new Error('Level not found.');

      affectsNumberOne = (levelBeingRemovedInfo.placement === 1 && levelBeingRemovedInfo.list === 'main-list');
      levelBeingRemovedId = levelBeingRemovedInfo.id;
      console.log(`[RemoveLevel] Attempting to remove: ${levelBeingRemovedInfo.name} (#${levelBeingRemovedInfo.placement}) from ${levelBeingRemovedInfo.list}. Affects #1: ${affectsNumberOne}`);


      // Log the change before deleting
      await tx.listChange.create({
        data: {
          type: 'REMOVE',
          description: `${levelBeingRemovedInfo.name} removed from ${levelBeingRemovedInfo.list} (was #${levelBeingRemovedInfo.placement})`,
          levelId: levelBeingRemovedInfo.id,
          list: levelBeingRemovedInfo.list,
        },
      });
      console.log(`[RemoveLevel] Logged removal of ${levelBeingRemovedInfo.name}`);


      // Delete the level
      await tx.level.delete({ where: { id: levelId } });
      console.log(`[RemoveLevel] Deleted level ${levelId}`);


      // Shift remaining levels up
      console.log(`[RemoveLevel] Shifting levels up from placement ${levelBeingRemovedInfo.placement + 1} in ${levelBeingRemovedInfo.list}`);
      await tx.level.updateMany({
        where: { list: levelBeingRemovedInfo.list, placement: { gt: levelBeingRemovedInfo.placement } },
        data: { placement: { decrement: 1 } },
      });

      // If #1 was removed, find users who beat it + find users who beat the *new* #1
      if (affectsNumberOne) {
          const newNumberOne = await tx.level.findFirst({
              where: { list: 'main-list', placement: 1 }, // Find the level that shifted into #1
              select: { id: true }
          });
          const affectedLevelIds = [levelBeingRemovedId, newNumberOne?.id].filter(id => id != null);
          console.log(`[RemoveLevel] #1 affected. Finding players involved with new #1 (${newNumberOne?.id}) and removed #1 (${levelBeingRemovedId})`);


          // Get names involved with the *new* #1 (if one exists)
          playerNamesToUpdate = await findPlayersInvolvedWithLevels(newNumberOne?.id ? [newNumberOne.id] : []);

          // Also add names involved with the *removed* #1 (using saved info)
          const removedLevelPlayers = new Set();
          if (levelBeingRemovedInfo.verifier) removedLevelPlayers.add(levelBeingRemovedInfo.verifier);
          if (Array.isArray(levelBeingRemovedInfo.records)) {
              levelBeingRemovedInfo.records.forEach(r => {
                  if (r.username && r.percent === 100) removedLevelPlayers.add(r.username);
              });
          }
          removedLevelPlayers.forEach(name => playerNamesToUpdate.push(name));
          playerNamesToUpdate = [...new Set(playerNamesToUpdate)]; // Ensure uniqueness
          console.log(`[RemoveLevel] Players to update stats for: ${playerNamesToUpdate.join(', ')}`);

      }

      success = true; // Mark transaction as successful
      return { message: `${levelBeingRemovedInfo.name} removed successfully.` };
    });

    // [FIX] Removed the call to regeneratePlayerStats.
    if (success) {
      console.log(`[RemoveLevel] Transaction successful.`);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[RemoveLevel] Failed to remove level from list:", error);
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
    let originalNumberOneId = null; // ID of level that was #1 before the move
    let finalNumberOneId = null; // ID of level that is #1 after the move
    let playerNamesToUpdate = [];

    const updatedLevel = await prisma.$transaction(async (tx) => {
      // Find the level being moved
      const levelToMove = await tx.level.findUnique({
          where: { id: levelId },
          select: { id: true, name: true, placement: true, list: true } // Select necessary fields
      });
      if (!levelToMove) throw new Error('Level not found');

      const oldPlacement = levelToMove.placement;
      const { list } = levelToMove;
      console.log(`[MoveLevel] Attempting to move ${levelToMove.name} from #${oldPlacement} to #${parsedNewPlacement} in ${list}`);


      // If placement isn't changing, do nothing
      if (oldPlacement === parsedNewPlacement) {
          console.log("[MoveLevel] Old and new placement are the same. No move needed.");
          success = true; 
          return levelToMove; // Return the unchanged level
      }


      // Determine if #1 is involved and get the ID of the current #1
      if (list === 'main-list' && (oldPlacement === 1 || parsedNewPlacement === 1)) {
          affectsNumberOne = true;
          const currentNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1 }, select: {id: true}});
          originalNumberOneId = currentNumberOne?.id;
           console.log(`[MoveLevel] #1 is affected. Level currently at #1: ${originalNumberOneId}`);
      }

      // --- Perform the move logic ---
      if (oldPlacement > parsedNewPlacement) {
        // Moving Up: Increment levels between newPlacement and oldPlacement(exclusive)
        console.log(`[MoveLevel] Shifting levels UP between #${parsedNewPlacement} and #${oldPlacement}`);
        await tx.level.updateMany({
          where: { list, placement: { gte: parsedNewPlacement, lt: oldPlacement } },
          data: { placement: { increment: 1 } },
        });
      } else {
        // Moving Down: Decrement levels between oldPlacement(exclusive) and newPlacement
        console.log(`[MoveLevel] Shifting levels DOWN between #${oldPlacement + 1} and #${parsedNewPlacement}`);
        await tx.level.updateMany({
          where: { list, placement: { gt: oldPlacement, lte: parsedNewPlacement } },
          data: { placement: { decrement: 1 } },
        });
      }
      // --- End shift logic ---

      // Update the moved level's placement
      console.log(`[MoveLevel] Updating ${levelToMove.name} to placement #${parsedNewPlacement}`);
      const finalUpdatedLevel = await tx.level.update({
        where: { id: levelId },
        data: { placement: parsedNewPlacement },
      });

      // Log the change
      console.log(`[MoveLevel] Logging move of ${finalUpdatedLevel.name}`);
      await tx.listChange.create({
        data: {
          type: 'MOVE',
          description: `${finalUpdatedLevel.name} moved from #${oldPlacement} to #${parsedNewPlacement}`,
          levelId: finalUpdatedLevel.id,
          list: list,
        },
      });

      // Enforce list limit (redundant if move is within limits, but safe)
      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

      // If #1 affected, find the final ID at #1 and affected player NAMES
      if (affectsNumberOne) {
          // Find the level that ended up at #1 *after* all shifts
          const actualNewNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1}, select: {id: true}});
          finalNumberOneId = actualNewNumberOne?.id;
          console.log(`[MoveLevel] Level finally at #1: ${finalNumberOneId}`);


          // Collect unique IDs involved and get associated player names
          const affectedLevelIds = [...new Set([originalNumberOneId, finalNumberOneId])].filter(id => id != null);
          console.log(`[MoveLevel] Finding players involved with affected #1 levels: ${affectedLevelIds.join(', ')}`);
          playerNamesToUpdate = await findPlayersInvolvedWithLevels(affectedLevelIds);
          console.log(`[MoveLevel] Players to update stats for: ${playerNamesToUpdate.join(', ')}`);

      }

      success = true; // Mark transaction as successful
      return finalUpdatedLevel; // Return the updated level
    });

    // [FIX] Removed the call to regeneratePlayerStats.
    if (success) {
      console.log(`[MoveLevel] Transaction successful.`);
    }

    return res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("[MoveLevel] Failed to move level in list:", error);
    return res.status(500).json({ message: error.message || 'Failed to move level.' });
  }
}


export async function updateLevel(req, res) {
  const { levelId, levelData } = req.body;
  if (!levelId || !levelData) { return res.status(400).json({ message: 'Level ID and level data are required.' }); }

  try {
    // Fetch original level data needed for comparisons
    const originalLevel = await prisma.level.findUnique({
        where: { id: levelId },
        select: { name: true, verifier: true, records: true, list: true, placement: true }
    });
    if (!originalLevel) {
        return res.status(404).json({ message: 'Level not found.' });
    }
    console.log(`[UpdateLevel] Updating level: ${originalLevel.name} (ID: ${levelId})`);


    // Perform the update
    const updatedLevel = await prisma.level.update({
      where: { id: levelId },
      data: {
        name: levelData.name,
        creator: levelData.creator,
        verifier: levelData.verifier,
        videoId: levelData.videoId,
        levelId: levelData.levelId ? parseInt(levelData.levelId, 10) : originalLevel.levelId, // Keep old if not provided or invalid
        description: levelData.description,
        tags: levelData.tags,
        // IMPORTANT: Do NOT update placement or list here. Use moveLevelInList for that.
        // records: levelData.records // Be careful updating records this way, might need specific endpoints
      },
       select: { name: true, verifier: true, records: true, list: true, placement: true } // Select updated data
    });

    let playerNamesToUpdate = [];
    let needsRegen = false;

    // Check if name changed (only matters if it affects hardest display)
    if (originalLevel.name !== updatedLevel.name && originalLevel.list === 'main-list') {
        needsRegen = true;
        // Find players whose hardest might have been this level (using old name)
        const playersWithOldHardest = await prisma.playerstats.findMany({
            where: { list: 'main-list', hardestDemonName: originalLevel.name },
            select: { name: true }
        });
        playersWithOldHardest.forEach(p => playerNamesToUpdate.push(p.name));
         console.log(`[UpdateLevel] Name changed. Players potentially affected (old hardest): ${playersWithOldHardest.map(p=>p.name).join(', ')}`);
    }

    // Check if verifier changed (affects score/hardest of old and new verifier)
    if (originalLevel.verifier !== updatedLevel.verifier && originalLevel.list === 'main-list') {
         needsRegen = true;
         if (originalLevel.verifier) playerNamesToUpdate.push(originalLevel.verifier);
         if (updatedLevel.verifier) playerNamesToUpdate.push(updatedLevel.verifier);
          console.log(`[UpdateLevel] Verifier changed. Adding ${originalLevel.verifier} and ${updatedLevel.verifier} to regen list.`);

    }

    // Check if records changed significantly (affects score/hardest of involved players)
    // A more robust check might involve comparing user sets and percentages
    const oldUsernames100 = new Set(originalLevel.records?.filter(r => r.percent === 100).map(r => r.username).filter(Boolean));
    const newUsernames100 = new Set(updatedLevel.records?.filter(r => r.percent === 100).map(r => r.username).filter(Boolean));
    if (oldUsernames100.size !== newUsernames100.size || ![...oldUsernames100].every(name => newUsernames100.has(name))) {
        if (originalLevel.list === 'main-list') {
            needsRegen = true;
            oldUsernames100.forEach(name => playerNamesToUpdate.push(name));
            newUsernames100.forEach(name => playerNamesToUpdate.push(name));
             console.log(`[UpdateLevel] 100% records changed. Adding involved players to regen list.`);
        }
    }

    // [FIX] Removed the call to regeneratePlayerStats.
    if (needsRegen) {
        playerNamesToUpdate = [...new Set(playerNamesToUpdate)]; // Ensure unique names
        console.log(`[UpdateLevel] Changes detected that require stats regeneration. Run 'npm run generate-stats' to update scores.`);
    } else {
        console.log("[UpdateLevel] No changes detected that require stats regeneration.");
    }

    return res.status(200).json(updatedLevel); // Return the updated level data
  } catch (error) {
    console.error("[UpdateLevel] Failed to update level:", error);
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
            // Optionally include related level data if needed
            // include: { level: { select: { name: true }} }
        });
        // Check if level exists even if history is empty
        if (history.length === 0) {
             const levelExists = await prisma.level.findUnique({ where: { id: idFromRequest }, select: { id: true } });
             if (!levelExists) return res.status(404).json({ message: 'Level not found.' });
        }
        return res.status(200).json(history);
    } catch (error) {
        console.error("Failed to fetch level history for ID:", idFromRequest, error);
        return res.status(500).json({ message: 'Failed to fetch level history.' });
    }
}


export async function getHistoricList(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'A date parameter is required.' });
  }

  try {
    // Validate date format
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    // Use end of day for comparison
    const targetDate = new Date(`${date}T23:59:59.999Z`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date value.' });
    }

    console.warn("[HistoricList] Reconstruction uses simplified backward undo and may be inaccurate.");

    // Start with current list state
    const currentLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      orderBy: { placement: 'asc' },
    });
    const levelsMap = new Map(currentLevels.map(level => [level.id, { ...level }]));

    // Get changes to undo (created AFTER target date), newest first
    const changesToUndo = await prisma.listChange.findMany({
      where: { list: 'main-list', createdAt: { gt: targetDate } },
      orderBy: { createdAt: 'desc' },
    });

    // --- Apply Undo Logic (Simplified) ---
    // This logic is complex and prone to errors when reversing shifts.
    // A forward-replay approach is generally more robust for accuracy.
    for (const change of changesToUndo) {
        if (change.type === 'ADD') {
            levelsMap.delete(change.levelId);
        }
        else if (change.Type === 'REMOVE') {
            const match = change.description.match(/(.+) removed from .+ \(was #(\d+)\)/);
            if (match) {
                const [, levelName, oldPlacementStr] = match;
                levelsMap.set(change.levelId, {
                    id: change.levelId, name: levelName || 'Unknown', placement: parseInt(oldPlacementStr),
                    list: 'main-list', creator: 'N/A', verifier: 'N/A',
                    videoId: '', levelId: 0, description: '', tags: []
                });
            }
        }
        else if (change.type === 'MOVE') {
            const match = change.description.match(/moved from #(\d+) to #(\d+)/);
            const levelData = levelsMap.get(change.levelId);
            if (match && levelData) {
                levelData.placement = parseInt(match[1]); // Revert to old placement
            }
        }
    }
    // --- End Simplified Undo ---

    // Convert map to array, sort by potentially inaccurate placement
    let finalHistoricList = Array.from(levelsMap.values())
                                  .sort((a, b) => a.placement - b.placement);

    // Re-normalize placements to ensure 1, 2, 3... sequence
    finalHistoricList.forEach((level, index) => {
      level.placement = index + 1;
    });

    // Filter out invalid placements potentially caused by undo issues
    finalHistoricList = finalHistoricList.filter(level => level.placement > 0);

    return res.status(200).json(finalHistoricList);

  } catch (error) {
    console.error("[HistoricList] Failed to get historic list:", error);
    return res.status(500).json({ message: 'Failed to retrieve historic list data.' });
  }
}
}
Here is the listsManagementHandlers.js file. I need the full untruncated file back.