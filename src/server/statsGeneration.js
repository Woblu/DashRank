// src/server/statsGeneration.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to calculate points for a main list level
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0; // Only ranks 1-150 give points
  // Formula: Points(r) = 500 * (0.9801)^(r - 1)
  return 500 * Math.pow(0.9801, rank - 1);
}

// Added optional userIds parameter
export async function regeneratePlayerStats(targetUserIds = null) {
  console.log(`Starting player stats regeneration... ${targetUserIds ? `Targeting ${targetUserIds.length} users.` : 'Targeting all users.'}`);
  try {
    // 1. Fetch all levels with their current placements
    const allLevels = await prisma.level.findMany({
      select: { id: true, name: true, placement: true, list: true },
      orderBy: { placement: 'asc' } // Ensure levels are ordered for debugging clarity
    });
    const levelMap = new Map(allLevels.map(lvl => [lvl.id, lvl]));

    // [DEBUG] Log the first few levels from the map to confirm placements are updated
    console.log('Level Map Snippet (Post-Update):', Array.from(levelMap.values()).slice(0, 5));


    // 2. Fetch users to update
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

        // 3. Calculate stats for each targeted user
        for (const user of usersToUpdate) {
            // [DEBUG] Add log for the specific user we're debugging
            if (user.username.toLowerCase() === 'zoink') {
                console.log(`\n--- Processing Zoink ---`);
                console.log(`Zoink's Records (Level IDs):`, user.personalRecords.map(r => r.levelId));
            }

            let hardestDemon = { name: 'N/A', placement: Infinity };
            let totalScore = 0; // Recalculate score based on current placements

            for (const record of user.personalRecords) {
                const level = levelMap.get(record.levelId);
                if (!level) continue;

                // [DEBUG] Log level info for Zoink's records
                if (user.username.toLowerCase() === 'zoink' && level.list === 'main-list') {
                    console.log(` -> Checking Level: ${level.name} (#${level.placement})`);
                }

                // Hardest demon logic
                if (level.list === 'main-list' && level.placement < hardestDemon.placement) {
                // [DEBUG] Log when hardest demon changes
                    if (user.username.toLowerCase() === 'zoink') {
                        console.log(`    -> New Hardest Found: ${level.name} (#${level.placement}) replacing ${hardestDemon.name} (#${hardestDemon.placement})`);
                    }
                    hardestDemon = { name: level.name, placement: level.placement };
                }

                // Score logic
                if (level.list === 'main-list' && record.percent === 100) {
                    totalScore += calculatePoints(level.placement);
                }
            }

            // [DEBUG] Log the final calculated hardest for Zoink
            if (user.username.toLowerCase() === 'zoink') {
                console.log(`Zoink Final Hardest Calculated: ${hardestDemon.name} (#${hardestDemon.placement})`);
            }


            // 4. Write individual JSON file
            const fileName = `${user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stats.json`;
            const filePath = path.join(outputDir, fileName); // Use outputDir defined earlier

            // Prepare data structure
            const jsonData = {
                name: user.username,
                hardest: hardestDemon.placement === Infinity ? 'N/A' : hardestDemon.name,
                hardestPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
                demonlistScore: totalScore,
                demonlistRank: null, // Placeholder, will be set during viewer list generation
                records: [], // Populate if needed by fetching detailed records
            };

            // [DEBUG] Log right before writing Zoink's file
            if (user.username.toLowerCase() === 'zoink') {
                console.log(`Writing to ${fileName}:`, JSON.stringify(jsonData, null, 2));
            }

            fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        }
         console.log(`Updated individual JSON files for ${usersToUpdate.length} users.`);
    }


    // --- [FIX] Always regenerate main-statsviewer.json ---
    console.log('Regenerating main-statsviewer.json...');
    // 5. Fetch ALL users again, this time just for ranking purposes
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

     // 6. Calculate scores for ALL users based on the updated levelMap
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

    // 7. Sort all players by score
    allPlayerStats.sort((a, b) => b.demonlistScore - a.demonlistScore);

    // 8. Generate viewer data with correct ranks
    const statsViewerData = allPlayerStats.map((stats, index) => ({
      name: stats.name,
      demonlistRank: index + 1,
      demonlistScore: stats.demonlistScore,
      // Add clan if needed
    }));

    // 9. Write the main-statsviewer.json file
    const statsViewerPath = path.resolve(process.cwd(), 'src/data/main-statsviewer.json');
    fs.writeFileSync(statsViewerPath, JSON.stringify(statsViewerData, null, 2));
    console.log(`Successfully regenerated main-statsviewer.json with ${statsViewerData.length} players.`);
    // --- End of main-statsviewer.json regeneration ---

    console.log('Player stats regeneration finished.');


  } catch (error) {
    console.error('Error regenerating player stats:', error);
    // Decide if you want to throw the error
    // throw error;
  }
}