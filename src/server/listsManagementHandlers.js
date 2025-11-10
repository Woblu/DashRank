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
    const recordExists = level.records.some(
      record => record.username === username && record.percent === parsedPercent
    );

    if (recordExists) {
      return res.status(409).json({ message: 'This exact record (player and percent) already exists on this level.' });
    }

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
    
    await prisma.listChange.create({
        data: {
          type: 'MOVE',
          description: `Admin added record: ${username} (${parsedPercent}%)`,
          levelId: levelId,
          list: level.list,
        },
    });
    
    return res.status(200).json(updatedLevel);

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

    const updatedRecords = level.records.filter(
      record => record.videoId !== recordVideoId
    );

    await prisma.level.update({
      where: { id: levelId },
      data: {
        records: updatedRecords
      }
    });

    console.log(`[Admin RemoveRecord] Removed record for ${recordToRemove.username} (${recordToRemove.percent}%) from level ${levelId}`);

    await prisma.listChange.create({
        data: {
          type: 'MOVE',
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
    if (!levelIds || !Array.isArray(levelIds) || levelIds.length === 0) {
        console.log("[Helper] findPlayersInvolvedWithLevels received no valid level IDs.");
        return [];
    }
    try {
        console.log(`[Helper] Finding players involved with level IDs: ${levelIds.join(', ')}`);
        const levels = await prisma.level.findMany({
            where: {
                id: { in: levelIds },
                list: 'main-list'
            },
            select: {
                verifier: true,
                records: {
                    select: {
                        username: true,
                        percent: true
                    }
                }
            },
        });

        const playerNames = new Set();
        levels.forEach(level => {
            if (level.verifier) playerNames.add(level.verifier);
            if (Array.isArray(level.records)) {
                level.records.forEach(record => {
                    if (record.username && record.percent === 100) {
                        playerNames.add(record.username);
                    }
                });
            }
        });

        const namesArray = Array.from(playerNames);
        console.log(`[Helper] Found involved players: ${namesArray.join(', ') || 'None'}`);
        return namesArray;
    } catch (error) {
        console.error("[Helper] Error finding players involved with levels:", levelIds, error);
        return [];
    }
}


export async function addLevelToList(req, res) {
  const { levelData, list, placement } = req.body;
  if (!levelData || !list || placement === undefined || !levelData.name || !levelData.creator || !levelData.verifier || !levelData.videoId ) {
    return res.status(400).json({ message: 'Missing required fields for levelData (name, creator, verifier, videoId) or list/placement.' });
  }

  const parsedPlacement = parseInt(placement, 10);
  const parsedLevelId = (levelData.levelId && String(levelData.levelId).trim() !== '') ? parseInt(levelData.levelId, 10) : null;

  if (isNaN(parsedPlacement) || parsedPlacement < 1 || (levelData.levelId && String(levelData.levelId).trim() !== '' && isNaN(parsedLevelId))) {
      return res.status(400).json({ message: 'Invalid placement number or Level ID format (must be a number if provided).' });
  }

  try {
    let newLevelId = null;
    let affectsNumberOne = (parsedPlacement === 1 && list === 'main-list');
    let playerNamesToUpdate = [];

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

        await tx.level.updateMany({
            where: { list, placement: { gte: parsedPlacement } },
            data: { placement: { increment: 1 } },
        });

        const dataToCreate = {
            name: levelData.name,
            creator: levelData.creator,
            verifier: levelData.verifier,
            videoId: levelData.videoId,
            levelId: parsedLevelId,
            placement: parsedPlacement,
            list,
            description: levelData.description || "",
            records: levelData.records || [],
            tags: levelData.tags || [],
        };

        const createdLevel = await tx.level.create({ data: dataToCreate });
        newLevelId = createdLevel.id;

        await tx.listChange.create({
            data: {
              type: 'ADD',
              description: `${createdLevel.name} added at #${parsedPlacement}`,
              levelId: createdLevel.id,
              list: list,
            },
        });

        const limit = list === 'main-list' ? 150 : 75;
        await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

        if (affectsNumberOne) {
            const affectedLevelIds = [oldNumberOneId, newLevelId].filter(id => id != null);
            playerNamesToUpdate = await findPlayersInvolvedWithLevels(affectedLevelIds);
        }

        return createdLevel;
    });

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
    let levelBeingRemovedInfo = null;
    let playerNamesToUpdate = [];

    const result = await prisma.$transaction(async (tx) => {
      levelBeingRemovedInfo = await tx.level.findUnique({
          where: { id: levelId },
          select: {id: true, name: true, placement: true, list: true, verifier: true, records: true}
      });
      if (!levelBeingRemovedInfo) throw new Error('Level not found.');

      affectsNumberOne = (levelBeingRemovedInfo.placement === 1 && levelBeingRemovedInfo.list === 'main-list');
      levelBeingRemovedId = levelBeingRemovedInfo.id;

      await tx.listChange.create({
        data: {
          type: 'REMOVE',
          description: `${levelBeingRemovedInfo.name} removed from ${levelBeingRemovedInfo.list} (was #${levelBeingRemovedInfo.placement})`,
          levelId: levelBeingRemovedInfo.id,
          list: levelBeingRemovedInfo.list,
        },
      });

      await tx.level.delete({ where: { id: levelId } });

      await tx.level.updateMany({
        where: { list: levelBeingRemovedInfo.list, placement: { gt: levelBeingRemovedInfo.placement } },
        data: { placement: { decrement: 1 } },
      });

      if (affectsNumberOne) {
          const newNumberOne = await tx.level.findFirst({
              where: { list: 'main-list', placement: 1 },
              select: { id: true }
          });
          const affectedLevelIds = [levelBeingRemovedId, newNumberOne?.id].filter(id => id != null);

          playerNamesToUpdate = await findPlayersInvolvedWithLevels(newNumberOne?.id ? [newNumberOne.id] : []);
          const removedLevelPlayers = new Set();
          if (levelBeingRemovedInfo.verifier) removedLevelPlayers.add(levelBeingRemovedInfo.verifier);
          if (Array.isArray(levelBeingRemovedInfo.records)) {
              levelBeingRemovedInfo.records.forEach(r => {
                  if (r.username && r.percent === 100) removedLevelPlayers.add(r.username);
              });
          }
          removedLevelPlayers.forEach(name => playerNamesToUpdate.push(name));
          playerNamesToUpdate = [...new Set(playerNamesToUpdate)];
      }

      success = true;
      return { message: `${levelBeingRemovedInfo.name} removed successfully.` };
    });

    if (success) console.log(`[RemoveLevel] Transaction successful.`);
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
    let originalNumberOneId = null;
    let finalNumberOneId = null;
    let playerNamesToUpdate = [];

    const updatedLevel = await prisma.$transaction(async (tx) => {
      const levelToMove = await tx.level.findUnique({
          where: { id: levelId },
          select: { id: true, name: true, placement: true, list: true }
      });
      if (!levelToMove) throw new Error('Level not found');

      const oldPlacement = levelToMove.placement;
      const { list } = levelToMove;

      if (oldPlacement === parsedNewPlacement) {
          success = true; 
          return levelToMove;
      }

      if (list === 'main-list' && (oldPlacement === 1 || parsedNewPlacement === 1)) {
          affectsNumberOne = true;
          const currentNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1 }, select: {id: true}});
          originalNumberOneId = currentNumberOne?.id;
      }

      if (oldPlacement > parsedNewPlacement) {
        await tx.level.updateMany({
          where: { list, placement: { gte: parsedNewPlacement, lt: oldPlacement } },
          data: { placement: { increment: 1 } },
        });
      } else {
        await tx.level.updateMany({
          where: { list, placement: { gt: oldPlacement, lte: parsedNewPlacement } },
          data: { placement: { decrement: 1 } },
        });
      }

      const finalUpdatedLevel = await tx.level.update({
        where: { id: levelId },
        data: { placement: parsedNewPlacement },
      });

      await tx.listChange.create({
        data: {
          type: 'MOVE',
          description: `${finalUpdatedLevel.name} moved from #${oldPlacement} to #${parsedNewPlacement}`,
          levelId: finalUpdatedLevel.id,
          list: list,
        },
      });

      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

      if (affectsNumberOne) {
          const actualNewNumberOne = await tx.level.findFirst({ where: { list: 'main-list', placement: 1}, select: {id: true}});
          finalNumberOneId = actualNewNumberOne?.id;
          const affectedLevelIds = [...new Set([originalNumberOneId, finalNumberOneId])].filter(id => id != null);
          playerNamesToUpdate = await findPlayersInvolvedWithLevels(affectedLevelIds);
      }

      success = true;
      return finalUpdatedLevel;
    });

    if (success) console.log(`[MoveLevel] Transaction successful.`);
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
    const originalLevel = await prisma.level.findUnique({
        where: { id: levelId },
        select: { name: true, verifier: true, records: true, list: true, placement: true }
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
        levelId: levelData.levelId ? parseInt(levelData.levelId, 10) : originalLevel.levelId,
        description: levelData.description,
        tags: levelData.tags,
      },
       select: { name: true, verifier: true, records: true, list: true, placement: true }
    });

    let playerNamesToUpdate = [];
    let needsRegen = false;

    const oldUsernames100 = new Set(originalLevel.records?.filter(r => r.percent === 100).map(r => r.username).filter(Boolean));
    const newUsernames100 = new Set(updatedLevel.records?.filter(r => r.percent === 100).map(r => r.username).filter(Boolean));
    if (oldUsernames100.size !== newUsernames100.size || ![...oldUsernames100].every(name => newUsernames100.has(name))) {
        if (originalLevel.list === 'main-list') {
            needsRegen = true;
            oldUsernames100.forEach(name => playerNamesToUpdate.push(name));
            newUsernames100.forEach(name => playerNamesToUpdate.push(name));
        }
    }

    if (needsRegen) {
        playerNamesToUpdate = [...new Set(playerNamesToUpdate)];
        console.log(`[UpdateLevel] Changes detected that require stats regeneration.`);
    }

    return res.status(200).json(updatedLevel);
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
        });
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
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const targetDate = new Date(`${date}T23:59:59.999Z`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date value.' });
    }

    console.warn("[HistoricList] Reconstruction uses simplified backward undo and may be inaccurate.");

    const currentLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      orderBy: { placement: 'asc' },
    });
    const levelsMap = new Map(currentLevels.map(level => [level.id, { ...level }]));

    const changesToUndo = await prisma.listChange.findMany({
      where: { list: 'main-list', createdAt: { gt: targetDate } },
      orderBy: { createdAt: 'desc' },
    });

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
    console.error("[HistoricList] Failed to get historic list:", error);
    return res.status(500).json({ message: 'Failed to retrieve historic list data.' });
  }
}
