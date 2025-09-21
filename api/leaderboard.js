// api/leaderboard.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const leaderboard = await prisma.leaderboardEntry.findMany({
      orderBy: { rank: 'asc' },
      take: 250, // Limit to top 250 players
    });
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard data.' });
  }
}