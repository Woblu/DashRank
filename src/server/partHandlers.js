import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches all parts and team members for a given layout.
 */
export async function getLayoutPartsAndTeam(req, res, layoutId) {
  try {
    const layout = await prisma.layout.findUnique({
      where: { id: layoutId },
      include: {
        parts: {
          include: { assignee: { select: { id: true, username: true } } },
          orderBy: { startPercent: 'asc' },
        },
        conversation: {
          include: { members: { select: { id: true, username: true } } },
        },
      },
    });

    if (!layout) {
      return res.status(404).json({ message: 'Layout not found.' });
    }

    const creator = await prisma.user.findUnique({ where: { id: layout.creatorId }, select: { id: true, username: true } });
    const members = layout.conversation?.members || [];
    const team = [...new Map([creator, ...members].filter(Boolean).map(item => [item.id, item])).values()];

    return res.status(200).json({ parts: layout.parts, team });
  } catch (error) {
    console.error('Failed to fetch layout parts and team:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * Creates a new part for a layout.
 */
export async function createPart(req, res, decodedToken) {
  const { layoutId, startPercent, endPercent, description } = req.body;
  if (!layoutId || startPercent === undefined || endPercent === undefined) {
    return res.status(400).json({ message: 'Layout ID and percent range are required.' });
  }

  try {
    const layout = await prisma.layout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.creatorId !== decodedToken.userId) {
      return res.status(403).json({ message: 'You are not authorized to modify this layout.' });
    }

    const newPart = await prisma.levelPart.create({
      data: {
        layoutId,
        startPercent: parseInt(startPercent, 10),
        endPercent: parseInt(endPercent, 10),
        description,
      },
    });
    return res.status(201).json(newPart);
  } catch (error) {
    console.error('Failed to create part:', error);
    return res.status(500).json({ message: 'Failed to create part.' });
  }
}

/**
 * Assigns a user to a level part.
 */
export async function assignPart(req, res, decodedToken) {
  const { partId, assigneeId } = req.body;
  if (!partId) {
    return res.status(400).json({ message: 'Part ID is required.' });
  }

  try {
    const part = await prisma.levelPart.findUnique({
      where: { id: partId },
      include: { layout: true },
    });

    if (!part || part.layout.creatorId !== decodedToken.userId) {
      return res.status(403).json({ message: 'You are not authorized to modify this layout.' });
    }

    const updatedPart = await prisma.levelPart.update({
      where: { id: partId },
      data: {
        assigneeId: assigneeId || null,
        status: assigneeId ? 'ASSIGNED' : 'OPEN',
      },
    });
    return res.status(200).json(updatedPart);
  } catch (error) {
    console.error('Failed to assign part:', error);
    return res.status(500).json({ message: 'Failed to assign part.' });
  }
}

/**
 * Updates the status of a level part (e.g., to COMPLETED).
 */
export async function updatePartStatus(req, res, decodedToken) {
  const { partId, status } = req.body;
  if (!partId || !status) {
    return res.status(400).json({ message: 'Part ID and new status are required.' });
  }

  try {
    const part = await prisma.levelPart.findUnique({
      where: { id: partId },
      include: { layout: true },
    });

    if (!part) {
      return res.status(404).json({ message: 'Part not found.' });
    }

    const isCreator = part.layout.creatorId === decodedToken.userId;
    const isAssignee = part.assigneeId === decodedToken.userId;

    if (!isCreator && !isAssignee) {
      return res.status(403).json({ message: 'You are not authorized to update this part.' });
    }

    const updatedPart = await prisma.levelPart.update({
      where: { id: partId },
      data: { status },
    });
    return res.status(200).json(updatedPart);
  } catch (error) {
    console.error('Failed to update part status:', error);
    return res.status(500).json({ message: 'Failed to update part status.' });
  }
}

/**
 * Deletes a level part.
 */
export async function deletePart(req, res, decodedToken) {
  const { partId } = req.body;
  if (!partId) {
    return res.status(400).json({ message: 'Part ID is required.' });
  }

  try {
    const part = await prisma.levelPart.findUnique({
      where: { id: partId },
      include: { layout: true },
    });

    if (!part || part.layout.creatorId !== decodedToken.userId) {
      return res.status(403).json({ message: 'You are not authorized to perform this action.' });
    }

    await prisma.levelPart.delete({ where: { id: partId } });
    return res.status(200).json({ message: 'Part deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete part:', error);
    return res.status(500).json({ message: 'Failed to delete part.' });
  }
}