// scripts/calculate-leaderboard.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const LIST_WEIGHTS = {
  main: 1.0, unrated: 0.75, platformer: 0.6,
  speedhack: 0.5, challenge: 0.4, future: 0.2,
};
const MAX_PLACEMENTS = {
  main: 150, unrated: 75, platformer: 75,
  speedhack: 75, challenge: 75, future: 75,
};

async function calculateScores() {
  console.log('Fetching all levels and approved submissions...');
  const levels = await prisma.level.findMany();
  const submissions = await prisma.submission.findMany({ where: { status: 'APPROVED' } });
  
  const playerScores = {};

  console.log('Calculating scores for each submission...');
  for (const sub of submissions) {
    // Find level, case-insensitive, just in case
    const level = levels.find(l => l.name.toLowerCase() === sub.levelName.toLowerCase());
    if (level && level.placement > 0) {
      const weight = LIST_WEIGHTS[level.list] || 0;
      const maxPlacement = MAX_PLACEMENTS[level.list] || 0;
      const points = (maxPlacement - level.placement + 1) * weight;
      
      if (points > 0) {
        playerScores[sub.player] = (playerScores[sub.player] || 0) + points;
      }
    }
  }

  const sortedPlayers = Object.entries(playerScores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([player, score], index) => ({
      rank: index + 1,
      player,
      score: parseFloat(score.toFixed(2)),
    }));

  console.log(`Calculated scores for ${sortedPlayers.length} players. Updating leaderboard...`);
  await prisma.leaderboardEntry.deleteMany({});
  if (sortedPlayers.length > 0) {
    await prisma.leaderboardEntry.createMany({ data: sortedPlayers });
  }

  console.log('Leaderboard updated successfully! ✅');
}

calculateScores()
  .catch(e => {
    console.error('An error occurred during leaderboard calculation:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });