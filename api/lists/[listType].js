// api/lists/[listType].js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { listType } = req.query; // Get the list name from the URL

  try {
    const levels = await prisma.level.findMany({
      where: {
        list: listType,
      },
      orderBy: {
        placement: 'asc',
      },
    });
    res.status(200).json(levels);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Failed to fetch level data.' });
  }
}