// src/server/statsGeneration.js
import { PrismaClient, RecordStatus } from '@prisma/client'; // Import RecordStatus if needed elsewhere, not strictly needed for queries here
import path from 'path'; // path is no longer needed for file writing

const prisma = new PrismaClient();

// Helper function to calculate points for a main list level
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// Function to regenerate stats and store in DB
export async function regeneratePlayerStats(targetUserIds = null) {
  console.log(`Starting DB player stats regeneration... ${targetUserIds ? `Targeting ${targetUserIds.length} users.` : 'Targeting all users.'}`);
  try {
    // 1. Fetch all levels with current placements
    const allLevels = await prisma.level.findMany({
      select: { id: true, name: true, placement: true, list: true },
      orderBy: { placement: 'asc' }
    });
    const levelMap = new Map(allLevels.map(lvl => [lvl.id, lvl]));

    console.log('[StatsGen] Level Map Snippet:', Array.from(levelMap.values()).filter(l => l.list === 'main-list').slice(0, 5)); // Log only main list

    // 2. Determine which users to process
    const userQuery = {
      where: {
        ...(targetUserIds && { id: { in: targetUserIds } }),
        // Fetch users who have *any* relevant record (even non-main list)
        // because we might need to reset stats if they no longer have main list completions.
        personalRecords: { some: { status: 'COMPLETED' } }, // Using your enum name
      },
      include: {
        personalRecords: {
          where: { status: 'COMPLETED' }, // Using your enum name
          select: { levelId: true, percent: true },
        },
      },
    };

    const usersToUpdate = await prisma.user.findMany(userQuery);

    if (usersToUpdate.length === 0) {
      console.log('[StatsGen] No relevant users found to update.');
    } else {
      console.log(`[StatsGen] Calculating stats for ${usersToUpdate.length} users.`);
      const statsToUpsert = []; // Collect stats data to upsert

      // 3. Calculate stats for each user
      for (const user of usersToUpdate) {
        let hardestDemon = { name: null, placement: Infinity }; // Use null for name initially
        let totalScore = 0;

        for (const record of user.personalRecords) {
          const level = levelMap.get(record.levelId);
          if (!level || level.list !== 'main-list') continue; // Only consider main list levels

          // Update hardest demon (use level placement directly)
          if (level.placement < hardestDemon.placement) {
             if (user.username.toLowerCase() === 'zoink') { // Keep debug log for Zoink
                console.log(`  [Zoink Debug] New Hardest: ${level.name} (#${level.placement}) replacing ${hardestDemon.name} (#${hardestDemon.placement})`);
             }
            hardestDemon = { name: level.name, placement: level.placement };
          }

          // Add score for 100% completions
          if (record.percent === 100) {
            totalScore += calculatePoints(level.placement);
          }
        }

         if (user.username.toLowerCase() === 'zoink') { // Keep debug log for Zoink
            console.log(`  [Zoink Debug] Final Hardest Calculated: ${hardestDemon.name} (#${hardestDemon.placement}) Score: ${totalScore.toFixed(2)}`);
         }


        // Prepare data for upsert
        statsToUpsert.push({
          userId: user.id,
          demonlistScore: totalScore,
          hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name, // Use null if no hardest
          hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement, // Use null if no hardest
          // Rank is handled separately below
        });
      }

      // 4. Upsert calculated stats (excluding rank)
      console.log(`[StatsGen] Upserting stats for ${statsToUpsert.length} users...`);
      for (const statData of statsToUpsert) {
        await prisma.playerStat.upsert({
          where: { userId: statData.userId },
          update: {
            demonlistScore: statData.demonlistScore,
            hardestDemonName: statData.hardestDemonName,
            hardestDemonPlacement: statData.hardestDemonPlacement,
            // Rank will be updated in the next step
          },
          create: {
            userId: statData.userId,
            demonlistScore: statData.demonlistScore,
            hardestDemonName: statData.hardestDemonName,
            hardestDemonPlacement: statData.hardestDemonPlacement,
            // Rank will be updated in the next step
          },
        });
      }
       console.log(`[StatsGen] Finished upserting base stats.`);
    }

    // --- Always Recalculate and Update Ranks ---
    console.log('[StatsGen] Recalculating all player ranks...');
    // 5. Fetch all player stats ordered by score
    const allPlayerStats = await prisma.playerStat.findMany({
      orderBy: [
        { demonlistScore: 'desc' },
        { updatedAt: 'asc' }, // Secondary sort for stable ranking on ties
      ],
      select: { id: true, userId: true, demonlistScore: true }, // Select only needed fields
    });

    // 6. Update ranks in batches
    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allPlayerStats.length; i++) {
        const stat = allPlayerStats[i];
        // Only assign rank if score > 0
        const rankToAssign = stat.demonlistScore > 0 ? currentRank++ : null;
        rankUpdates.push(
            prisma.playerStat.update({
                where: { id: stat.id },
                data: { demonlistRank: rankToAssign },
            })
        );
    }

     // Also update stats for anyone not in allPlayerStats (score is 0 or less) to have null rank
    rankUpdates.push(
        prisma.playerStat.updateMany({
            where: { demonlistScore: { lte: 0 } },
            data: { demonlistRank: null },
        })
    );


    console.log(`[StatsGen] Applying ${rankUpdates.length} rank updates...`);
    // Execute all rank updates in a transaction
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen] Finished updating ranks.');
    // --- End Rank Update ---

    console.log('[StatsGen] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen] Error regenerating player stats in DB:', error);
    // Re-throw the error if you want the calling function (list management) to know it failed
    // throw error;
  }
}

// Example of how to call:
// regeneratePlayerStats(); // Regenerate all
// regeneratePlayerStats(['userId1', 'userId2']); // Regenerate specific users + all ranks