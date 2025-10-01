import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches all layouts for the public gallery.
 */
export async function listLayouts(req, res) {
  try {
    const layouts = await prisma.layout.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { username: true } },
      },
    });
    return res.status(200).json(layouts);
  } catch (error) {
    console.error("Failed to fetch layouts:", error);
    return res.status(500).json({ message: 'Failed to fetch layouts.' });
  }
}

/**
 * Fetches a single layout by its unique ID.
 */
export async function getLayoutById(req, res, layoutId) {
  try {
    const layout = await prisma.layout.findUnique({
      where: { id: layoutId },
      include: {
        creator: { select: { username: true } },
      },
    });

    if (!layout) {
      return res.status(404).json({ message: 'Layout not found.' });
    }

    return res.status(200).json(layout);
  } catch (error) {
    console.error(`Failed to fetch layout ${layoutId}:`, error);
    return res.status(500).json({ message: 'Failed to fetch layout.' });
  }
}


/**
 * Creates a new layout for the authenticated user.
 */
export async function createLayout(req, res, decodedToken) {
  const { levelName, description, songName, songId, videoUrl, difficulty, tags } = req.body;

  if (!levelName || !videoUrl || !difficulty) {
    return res.status(400).json({ message: 'Level name, video URL, and difficulty are required.' });
  }

  try {
    const newLayout = await prisma.layout.create({
      data: {
        levelName,
        description,
        songName,
        songId,
        videoUrl,
        difficulty,
        tags: tags || [],
        creatorId: decodedToken.userId,
      },
    });
    return res.status(201).json(newLayout);
  } catch (error) {
    console.error("Failed to create layout:", error);
    return res.status(500).json({ message: 'Failed to create layout.' });
  }
}

/**
 * Deletes a layout as an admin action.
 * Also deletes all reports associated with that layout.
 */
export async function deleteLayoutByAdmin(req, res) {
    const { layoutId } = req.body;

    if (!layoutId) {
        return res.status(400).json({ message: 'Layout ID is required.' });
    }

    try {
        // Use a transaction to ensure both operations succeed or fail together
        await prisma.$transaction([
            // First, delete all reports associated with the layout
            prisma.layoutReport.deleteMany({
                where: { reportedLayoutId: layoutId },
            }),
            // Then, delete the layout itself
            prisma.layout.delete({
                where: { id: layoutId },
            }),
        ]);
        return res.status(200).json({ message: 'Layout and associated reports deleted successfully.' });
    } catch (error) {
        console.error("Failed to delete layout:", error);
        return res.status(500).json({ message: 'Failed to delete layout.' });
    }
}