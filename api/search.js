// api/search.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // We'll get the search query from a URL parameter like /api/search?q=...
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    const results = await prisma.level.findMany({
      where: {
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            creator: {
              contains: q,
              mode: 'insensitive', // Case-insensitive search
            },
          },
        ],
      },
      orderBy: {
        placement: 'asc',
      },
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Failed to fetch search results.' });
  }
}