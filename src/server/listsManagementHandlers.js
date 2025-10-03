import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Adds a new level to a list, shifting others down and removing any that fall off.
 */
export async function addLevelToList(req, res) {
  const { levelData, list, placement } = req.body;
  if (!levelData || !list || placement === undefined) {
    return res.status(400).json({ message: 'Missing required fields: levelData, list, or placement.' });
  }

  try {
    const newLevel = await prisma.$transaction(async (tx) => {
      // 1. Shift all levels at or below the new placement down by one rank.
      await tx.level.updateMany({
        where: { list, placement: { gte: placement } },
        data: { placement: { increment: 1 } },
      });

      // 2. Create the new level at the now-vacant placement.
      const createdLevel = await tx.level.create({
        data: { ...levelData, placement, list },
      });

      // 3. Delete any levels that have been pushed off the list.
      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({
        where: {
          list: list,
          placement: {
            gt: limit,
          },
        },
      });

      return createdLevel;
    });
    return res.status(201).json(newLevel);
  } catch (error) {
    console.error("Failed to add level to list:", error);
    return res.status(500).json({ message: 'Failed to add level.' });
  }
}

/**
 * Removes a level from a list, shifting subsequent levels up to close the gap.
 */
export async function removeLevelFromList(req, res) {
  const { levelId } = req.body;
  if (!levelId) {
    return res.status(400).json({ message: 'Missing required field: levelId.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const levelToRemove = await tx.level.findUnique({ where: { id: levelId } });
      if (!levelToRemove) throw new Error('Level not found.');

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

/**
 * Moves a level to a new placement, re-shuffling and removing any that fall off.
 */
export async function moveLevelInList(req, res) {
  const { levelId, newPlacement } = req.body;
  if (!levelId || newPlacement === undefined) {
    return res.status(400).json({ message: 'Missing required fields: levelId or newPlacement.' });
  }

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

      // Delete any levels that have been pushed off the list by the shuffle.
      const limit = list === 'main-list' ? 150 : 75;
      await tx.level.deleteMany({
        where: {
          list: list,
          placement: {
            gt: limit,
          },
        },
      });

      return finalUpdatedLevel;
    });
    return res.status(200).json(updatedLevel);
  } catch (error) {
    console.error("Failed to move level in list:", error);
    return res.status(500).json({ message: error.message || 'Failed to move level.' });
  }
}