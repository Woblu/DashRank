import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function addLevelToList(req, res) {
  const { levelData, list, placement } = req.body;
  if (!levelData || !list || placement === undefined || !levelData.name || !levelData.creator || !levelData.verifier || !levelData.videoId || !levelData.levelId) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const newLevel = await prisma.$transaction(async (tx) => {
      await tx.level.updateMany({
        where: { list, placement: { gte: placement } },
        data: { placement: { increment: 1 } },
      });

      const dataToCreate = {
        ...levelData,
        levelId: parseInt(levelData.levelId, 10),
        placement: parseInt(placement, 10),
        list,
      };
      const createdLevel = await tx.level.create({ data: dataToCreate });

      await tx.listChange.create({
        data: {
          type: 'ADD',
          description: `${createdLevel.name} added at #${placement}`,
          levelId: createdLevel.id,
        },
      });

      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });

      return createdLevel;
    });
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
    const result = await prisma.$transaction(async (tx) => {
      const levelToRemove = await tx.level.findUnique({ where: { id: levelId } });
      if (!levelToRemove) throw new Error('Level not found.');
      await tx.listChange.create({
        data: {
          type: 'REMOVE',
          description: `${levelToRemove.name} removed from ${levelToRemove.list} (was #${levelToRemove.placement})`,
          levelId: levelToRemove.id,
        },
      });
      await tx.level.delete({ where: { id: levelId } });
      await tx.level.updateMany({
        where: { list: levelToRemove.list, placement: { gt: levelToRemove.placement } },
        data: { placement: { decrement: 1 } },
      });
      return { message: `${levelToRemove.name} removed successfully.` };
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to remove level from list:", error);
    return res.status(500).json({ message: error.message || 'Failed to remove level.' });
  }
}

export async function moveLevelInList(req, res) {
  const { levelId, newPlacement } = req.body;
  if (!levelId || newPlacement === undefined) { return res.status(400).json({ message: 'Missing fields: levelId or newPlacement.' }); }
  try {
    const updatedLevel = await prisma.$transaction(async (tx) => {
      const levelToMove = await tx.level.findUnique({ where: { id: levelId } });
      if (!levelToMove) throw new Error('Level not found');
      const oldPlacement = levelToMove.placement;
      const { list } = levelToMove;
      if (oldPlacement !== newPlacement) {
        if (oldPlacement > newPlacement) {
          await tx.level.updateMany({
            where: { list, placement: { gte: newPlacement, lt: oldPlacement } },
            data: { placement: { increment: 1 } },
          });
        } else {
          await tx.level.updateMany({
            where: { list, placement: { gt: oldPlacement, lte: newPlacement } },
            data: { placement: { decrement: 1 } },
          });
        }
      }
      const finalUpdatedLevel = await tx.level.update({
        where: { id: levelId },
        data: { placement: newPlacement },
      });
      if (oldPlacement !== newPlacement) {
        await tx.listChange.create({
          data: {
            type: 'MOVE',
            description: `${finalUpdatedLevel.name} moved from #${oldPlacement} to #${newPlacement}`,
            levelId: finalUpdatedLevel.id,
          },
        });
      }
      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({ where: { list, placement: { gt: limit } } });
      return finalUpdatedLevel;
    });
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
    const updatedLevel = await prisma.level.update({
      where: { id: levelId },
      data: {
        name: levelData.name,
        creator: levelData.creator,
        verifier: levelData.verifier,
        videoId: levelData.videoId,
        levelId: levelData.levelId ? parseInt(levelData.levelId, 10) : null,
      },
    });
    return res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("Failed to update level:", error);
    return res.status(500).json({ message: 'Failed to update level.' });
  }
}

export async function getLevelHistory(req, res, levelId) {
    if (!levelId) {
        return res.status(400).json({ message: 'Level ID is required.' });
    }
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