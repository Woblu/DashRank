// api/lists/[listType].js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { listType } = req.query; // e.g., "speedhack"

  try {
    const levels = await prisma.level.findMany({
      where: {
        list: {
          equals: listType,
          mode: 'insensitive', // This makes the search ignore capitalization
        },
      },
      orderBy: {
        placement: 'asc',
      },
    });
    res.status(200).json(levels);
  } catch (error) {
    console.error(`Error fetching list for type: ${listType}`, error);
    res.status(500).json({ error: 'Failed to fetch level data.' });
  }
}