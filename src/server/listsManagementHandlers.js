import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Adds a new level to a specific list at a given placement, shifting existing levels down.
 * @param {object} levelData The data for the new level (name, creator, videoId, etc.).
 * @param {string} list The name of the list (e.g., 'main-list').
 * @param {number} placement The rank where the new level should be inserted.
 */
export async function addLevelToList(levelData, list, placement) {
  return prisma.$transaction(async (tx) => {
    // 1. Shift all levels at or below the new placement down by one rank.
    await tx.level.updateMany({
      where: {
        list: list,
        placement: {
          gte: placement,
        },
      },
      data: {
        placement: {
          increment: 1,
        },
      },
    });

    // 2. Create the new level at the now-vacant placement.
    const newLevel = await tx.level.create({
      data: {
        ...levelData,
        placement,
        list,
      },
    });

    return newLevel;
  });
}

/**
 * Removes a level from a list, shifting subsequent levels up to close the gap.
 * @param {string} levelId The ID of the level to remove.
 */
export async function removeLevelFromList(levelId) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the level to get its placement and list name before deleting.
    const levelToRemove = await tx.level.findUnique({
      where: { id: levelId },
    });

    if (!levelToRemove) {
      throw new Error('Level not found.');
    }

    const { placement, list } = levelToRemove;

    // 2. Delete the level.
    await tx.level.delete({
      where: { id: levelId },
    });

    // 3. Shift all levels that were below the removed one up by one rank.
    await tx.level.updateMany({
      where: {
        list: list,
        placement: {
          gt: placement,
        },
      },
      data: {
        placement: {
          decrement: 1,
        },
      },
    });

    return { message: `${levelToRemove.name} removed successfully.` };
  });
}

/**
 * Moves a level to a new placement within its list, re-shuffling others accordingly.
 * @param {string} levelId The ID of the level to move.
 * @param {number} newPlacement The target rank for the level.
 */
export async function moveLevelInList(levelId, newPlacement) {
  return prisma.$transaction(async (tx) => {
    const levelToMove = await tx.level.findUnique({
      where: { id: levelId },
    });

    if (!levelToMove) {
      throw new Error('Level not found');
    }

    const oldPlacement = levelToMove.placement;
    const { list } = levelToMove;

    if (oldPlacement === newPlacement) {
      return levelToMove; // No changes needed
    }

    // Determine the range of levels affected by the move
    const start = Math.min(oldPlacement, newPlacement);
    const end = Math.max(oldPlacement, newPlacement);

    if (oldPlacement > newPlacement) {
      // Moving a level UP the list (e.g., from #10 to #5)
      // Shift levels between newPlacement and oldPlacement DOWN by one.
      await tx.level.updateMany({
        where: {
          list,
          placement: { gte: newPlacement, lt: oldPlacement },
        },
        data: { placement: { increment: 1 } },
      });
    } else {
      // Moving a level DOWN the list (e.g., from #5 to #10)
      // Shift levels between oldPlacement and newPlacement UP by one.
      await tx.level.updateMany({
        where: {
          list,
          placement: { gt: oldPlacement, lte: newPlacement },
        },
        data: { placement: { decrement: 1 } },
      });
    }

    // Finally, update the moved level to its new placement.
    const updatedLevel = await tx.level.update({
      where: { id: levelId },
      data: { placement: newPlacement },
    });

    return updatedLevel;
  });
}