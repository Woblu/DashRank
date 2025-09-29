import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches all layouts for the public gallery.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
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
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {string} layoutId The ID of the layout to fetch.
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
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
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