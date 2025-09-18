// api/level/[levelId].js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Get the levelId from the URL (e.g., '8424015')
  const { levelId } = req.query;

  try {
    // Find the first level where the levelId matches.
    // We use parseInt because the ID from the URL is a string,
    // but in the database, it's a number (Int).
    const level = await prisma.level.findFirst({ // Changed from findUnique to findFirst
      where: {
        levelId: parseInt(levelId),
      },
    });

    // If no level is found, return a 404
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }

    // If the level is found, return it
    res.status(200).json(level);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch level data.' });
  }
}