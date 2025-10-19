// src/server/statsGeneration.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// [FIX] Added optional userIds parameter
export async function regeneratePlayerStats(targetUserIds = null) {
  console.log(`Starting player stats regeneration... ${targetUserIds ? `Targeting ${targetUserIds.length} users.` : 'Targeting all users.'}`);
  try {
    const allLevels = await prisma.level.findMany({
      select: { id: true, name: true, placement: true, list: true },
    });
    const levelMap = new Map(allLevels.map(lvl => [lvl.id, lvl]));

    // [FIX] Build the query based on targetUserIds
    const userQuery = {
      where: {
        // If targetUserIds is provided, filter by those IDs
        ...(targetUserIds && { id: { in: targetUserIds } }),
        // Always ensure users have records
        personalRecords: { some: { status: 'APPROVED' } },
      },
      include: {
        personalRecords: {
          where: { status: 'APPROVED' },
          select: { levelId: true, percent: true },
        },
      },
    };

    const usersToUpdate = await prisma.user.findMany(userQuery);

    if (usersToUpdate.length === 0) {
        console.log('No relevant users found to update.');
        // Still need to regenerate the main viewer list even if no individuals were updated
    } else {
        console.log(`Recalculating stats for ${usersToUpdate.length} users.`);
        // [FIX] Only update the files for the targeted users
        const outputDir = path.resolve(process.cwd(), 'src/data/playerstats');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const user of usersToUpdate) {
          let hardestDemon = { name: 'N/A', placement: Infinity };
          let totalScore = 0; // Recalculate score based on current placements

          for (const record of user.personalRecords) {
            const level = levelMap.get(record.levelId);
            if (!level) continue;

            if (level.list === 'main-list' && level.placement < hardestDemon.placement) {
              hardestDemon = { name: level.name, placement: level.placement };
            }
            if (level.list === 'main-list' && record.percent === 100) {
              totalScore += calculatePoints(level.placement);
            }
          }

          const fileName = `${user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stats.json`;
          const filePath = path.join(outputDir, fileName);

          // Prepare data (you might need to read existing file to preserve other fields)
          // For simplicity, overwriting with essential calculated fields
          const jsonData = {
            name: user.username,
            hardest: hardestDemon.placement === Infinity ? 'N/A' : hardestDemon.name,
            hardestPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
            demonlistScore: totalScore,
            // Rank will be updated when regenerating main-statsviewer.json
            demonlistRank: null, // Placeholder
            records: [], // Populate if needed
          };
          fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        }
         console.log(`Updated individual JSON files for ${usersToUpdate.length} users.`);
    }


    // --- [FIX] Always regenerate main-statsviewer.json ---
    console.log('Regenerating main-statsviewer.json...');
    // Fetch ALL users again, this time just for ranking purposes
     const allRankedUsers = await prisma.user.findMany({
       where: {
         personalRecords: { some: { status: 'APPROVED' } },
       },
       include: {
         personalRecords: {
           where: { status: 'APPROVED', percent: 100 }, // Only 100% records count for score
           select: { levelId: true },
         },
       },
     });

     let allPlayerStats = [];
     for(const user of allRankedUsers) {
         let score = 0;
         for (const record of user.personalRecords) {
             const level = levelMap.get(record.levelId);
             if (level && level.list === 'main-list') {
                 score += calculatePoints(level.placement);
             }
         }
         if (score > 0) { // Only include players with a score
             allPlayerStats.push({ name: user.username, demonlistScore: score });
         }
     }

    allPlayerStats.sort((a, b) => b.demonlistScore - a.demonlistScore);

    const statsViewerData = allPlayerStats.map((stats, index) => ({
      name: stats.name,
      demonlistRank: index + 1,
      demonlistScore: stats.demonlistScore,
      // Add clan if needed
    }));

    const statsViewerPath = path.resolve(process.cwd(), 'src/data/main-statsviewer.json');
    fs.writeFileSync(statsViewerPath, JSON.stringify(statsViewerData, null, 2));
    console.log(`Successfully regenerated main-statsviewer.json with ${statsViewerData.length} players.`);
    // --- End of main-statsviewer.json regeneration ---


  } catch (error) {
    console.error('Error regenerating player stats:', error);
  }
}