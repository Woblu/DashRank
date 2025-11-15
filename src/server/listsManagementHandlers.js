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
      return res.status(4404).json({ message: 'Level not found.' });
    }

    // Check if this exact record (username + videoId) already exists
    const recordExists = level.records.some(record => record.username === username && record.videoId === videoId);
    if (recordExists) {
      return res.status(409).json({ message: 'This exact record already exists on the level.' });
    }

    const newRecord = { username, percent: parsedPercent, videoId };

    await prisma.level.update({
      where: { id: levelId },
      data: {
        records: {
          push: newRecord,
        },
      },
    });

    return res.status(201).json({ message: 'Record added successfully.' });
  } catch (error) {
    console.error('Add record error:', error);
    return res.status(500).json({ message: 'Internal server error while adding record.' });
  }
}


// [NEW] Function to remove a record from a level by an admin
export async function removeRecordFromList(req, res) {
  const { levelId, recordVideoId } = req.body;

  if (!levelId || !recordVideoId) {
    return res.status(400).json({ message: 'Missing required fields: levelId and recordVideoId.' });
  }

  try {
    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      return res.status(404).json({ message: 'Level not found.' });
    }

    const recordExists = level.records.some(record => record.videoId === recordVideoId);
    if (!recordExists) {
      return res.status(404).json({ message: 'Record not found on this level.' });
    }

    const updatedRecords = level.records.filter(record => record.videoId !== recordVideoId);

    await prisma.level.update({
      where: { id: levelId },
      data: {
        records: updatedRecords,
      },
    });

    return res.status(200).json({ message: 'Record removed successfully.' });
  } catch (error) {
    console.error('Remove record error:', error);
    return res.status(500).json({ message: 'Internal server error while removing record.' });
  }
}


// Function to add a new level to a list
export async function addLevelToList(req, res) {
  const { name, creator, verifier, videoId, levelId, list, placement, description, tags } = req.body;
  if (!name || !creator || !verifier || !videoId || !list || !placement) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const numericPlacement = parseInt(placement, 10);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Shift existing levels down
      await tx.level.updateMany({
        where: {
          list: list,
          placement: { gte: numericPlacement },
        },
        data: {
          placement: { increment: 1 },
        },
      });

      // 2. Add the new level
      const newLevel = await tx.level.create({
        data: {
          name, creator, verifier, videoId,
          levelId: levelId ? parseInt(levelId, 10) : null,
          list,
          placement: numericPlacement,
          description: description || '',
          tags: tags || [],
          records: [], // Initialize with an empty records array
        },
      });
      
      // 3. Create a change log
      await tx.listChange.create({
        data: {
          type: 'ADD',
          description: `${name} added to ${list} at #${numericPlacement}`,
          list: list,
          levelId: newLevel.id,
        },
      });
    });

    // [FIX] Awaiting the stats regeneration is not feasible in a serverless fn
    // This should be a separate cron job or manually triggered action
    // regeneratePlayerStats(); // This will run in the background (if it's not awaited)

    return res.status(201).json({ message: 'Level added successfully.' });
  } catch (error) {
    console.error('Add level error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Function to move a level within a list
export async function moveLevelInList(req, res) {
  const { levelId, oldPlacement, newPlacement, list } = req.body;
  if (!levelId || !oldPlacement || !newPlacement || !list) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const oldP = parseInt(oldPlacement, 10);
  const newP = parseInt(newPlacement, 10);

  if (oldP === newP) {
    return res.status(200).json({ message: 'No change in placement.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Determine direction of move
      if (newP < oldP) {
        // Moving UP (e.g., #5 to #3)
        // Increment placement for levels between newP and oldP (exclusive of oldP)
        await tx.level.updateMany({
          where: {
            list: list,
            placement: { gte: newP, lt: oldP },
          },
          data: {
            placement: { increment: 1 },
          },
        });
      } else {
        // Moving DOWN (e.g., #3 to #5)
        // Decrement placement for levels between oldP and newP (exclusive of oldP)
        await tx.level.updateMany({
          where: {
            list: list,
            placement: { gt: oldP, lte: newP },
          },
          data: {
            placement: { decrement: 1 },
          },
        });
      }

      // Finally, update the target level's placement
      const updatedLevel = await tx.level.update({
        where: { id: levelId },
        data: { placement: newP },
      });
      
      // Create a change log
      await tx.listChange.create({
        data: {
          type: 'MOVE',
          description: `${updatedLevel.name} moved from #${oldP} to #${newP}`,
          list: list,
          levelId: updatedLevel.id,
        },
      });
    });
    
    // regeneratePlayerStats(); // See comment in addLevelToList
    return res.status(200).json({ message: 'Level moved successfully.' });

  } catch (error) {
    console.error('Move level error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Function to remove a level from a list
export async function removeLevelFromList(req, res) {
    const { levelId } = req.body;
    if (!levelId) {
        return res.status(400).json({ message: 'Level ID is required.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Find the level to be deleted
            const levelToRemove = await tx.level.findUnique({
                where: { id: levelId },
            });

            if (!levelToRemove) {
                throw new Error('Level not found.');
            }

            const { list, placement, name } = levelToRemove;

            // 2. Delete the level
            await tx.level.delete({
                where: { id: levelId },
            });

            // 3. Shift all levels below it up by one
            await tx.level.updateMany({
                where: {
                    list: list,
                    placement: { gt: placement },
                },
                data: {
                    placement: { decrement: 1 },
                },
            });
            
             // 4. Create a change log
            await tx.listChange.create({
              data: {
                type: 'REMOVE',
                description: `${name} removed from ${list} (was #${placement})`,
                list: list,
                levelId: levelId,
              },
            });
        });

        // regeneratePlayerStats(); // See comment in addLevelToList
        return res.status(200).json({ message: 'Level removed successfully.' });

    } catch (error) {
        console.error('Remove level error:', error);
        if (error.message === 'Level not found.') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

// Function to update a level's details
export async function updateLevel(req, res) {
    const { levelId } = req.body;
    if (!levelId) {
        return res.status(400).json({ message: 'Level ID is required.' });
    }

    // Extract only the fields that are allowed to be updated
    const { name, creator, verifier, videoId, levelId: gdLevelId, description, tags } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (creator) updateData.creator = creator;
    if (verifier) updateData.verifier = verifier;
    if (videoId) updateData.videoId = videoId;
    if (gdLevelId) updateData.levelId = parseInt(gdLevelId, 10);
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    
    try {
        const updatedLevel = await prisma.level.update({
            where: { id: levelId },
            data: updateData,
        });
        
        // This might be a good place for a specific type of ListChange log if needed
        
        return res.status(200).json(updatedLevel);
    } catch (error) {
        console.error('Update level error:', error);
        return res.status(500).json({ message: 'Failed to update level.' });
    }
}

// Function to get level history
export async function getLevelHistory(req, res, levelId) {
    if (!levelId) {
        return res.status(4Am00).json({ message: 'Level ID is required.' });
    }
    try {
        const changes = await prisma.listChange.findMany({
            where: { levelId: levelId },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(changes);
    } catch (error) {
        console.error('Get level history error:', error);
        return res.status(500).json({ message: 'Failed to get level history.' });
    }
}


// Function to get the full list history for a specific date
export async function getHistoricList(req, res) {
    // [FIX] 'date' is now a full ISO string (e.g., "2025-10-10T17:00:00.000Z")
    const { date } = req.query; 
    if (!date) {
        return res.status(400).json({ message: 'Date is required.' });
    }

    // [FIX] Create a Date object *directly* from the ISO string.
    // This correctly interprets it as UTC, regardless of the server's timezone.
    const targetDate = new Date(date);
    
    // [FIX] We still set this to the end of the day to be safe,
    // but the date (10th) is now correct.
    targetDate.setUTCHours(23, 59, 59, 999); 

    try {
    // 1. Get all levels on the main-list at the current time
    const allLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      orderBy: { placement: 'asc' },
    });
    
    // 2. Get all changes from the target date until now, in reverse chronological order
    const changes = await prisma.listChange.findMany({
      where: {
        list: 'main-list',
        createdAt: { gt: targetDate }, // This query is now correct
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Reconstruct the list at the targetDate by reversing the changes
    let levelsMap = new Map(allLevels.map(level => [level.id, { ...level }]));

    for (const change of changes) {
        if (change.type === 'ADD') {
            levelsMap.delete(change.levelId);
        }
        else if (change.type === 'REMOVE') {
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
                levelData.placement = parseInt(match[1]);
            }
        }
    }

    let finalHistoricList = Array.from(levelsMap.values()).sort((a, b) => a.placement - b.placement);
    finalHistoricList.forEach((level, index) => {
      level.placement = index + 1;
    });
    finalHistoricList = finalHistoricList.filter(level => level.placement > 0);

    return res.status(200).json(finalHistoricList);
  } catch (error) {
    console.error('Get historic list error:', error);
    return res.status(500).json({ message: 'Failed to fetch historic list.' });
  }
}

// ==================================================================
// ==================== THIS IS THE NEW FUNCTION ====================
// ==================================================================

/**
 * (ADMIN) Moves a record up or down in a level's record list.
 */
export async function moveRecordInList(req, res) {
    const { levelId, recordVideoId, direction } = req.body;

    if (!levelId || !recordVideoId || !direction) {
        return res.status(400).json({ message: 'levelId, recordVideoId, and direction (up/down) are required.' });
    }

    if (direction !== 'up' && direction !== 'down') {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'." });
    }

    try {
        const level = await prisma.level.findUnique({
            where: { id: levelId },
        });

        if (!level) {
            return res.status(404).json({ message: 'Level not found.' });
        }

        let records = level.records;
        const recordIndex = records.findIndex(r => r.videoId === recordVideoId);

        if (recordIndex === -1) {
            return res.status(404).json({ message: 'Record not found on this level.' });
        }

        // --- Reordering Logic ---
        if (direction === 'up') {
            if (recordIndex === 0) {
                return res.status(400).json({ message: 'Record is already at the top.' });
            }
            // Swap with the element above
            [records[recordIndex - 1], records[recordIndex]] = [records[recordIndex], records[recordIndex - 1]];
        } else { // direction === 'down'
            if (recordIndex === records.length - 1) {
                return res.status(400).json({ message: 'Record is already at the bottom.' });
            }
            // Swap with the element below
            [records[recordIndex + 1], records[recordIndex]] = [records[recordIndex], records[recordIndex + 1]];
        }

        // Update the level with the new records array
        await prisma.level.update({
            where: { id: levelId },
            data: {
                records: records,
            },
        });

        return res.status(200).json({ message: `Record moved ${direction} successfully.` });

    } catch (error) {
        console.error('Move record error:', error);
        return res.status(5I00).json({ message: 'Internal server error while moving record.' });
    }
}