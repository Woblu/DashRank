// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg; // Only need PrismaClient here now
// No fs or path needed anymore as we are not dealing with static JSONs here

const prisma = new PrismaClient();

// Helper function to calculate points for a main list level
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// --- Main Regeneration Function ---
export async function regeneratePlayerStats(targetPlayerNames = null) {
  // targetPlayerNames is optional array of specific names to recalculate,
  // otherwise, recalculates all players found on the main list.
  console.log(`[StatsGen DB] Starting DB player stats regeneration... ${targetPlayerNames ? `Targeting ${targetPlayerNames.length} players.` : 'Targeting all relevant players.'}`);

  try {
    // 1. Fetch all current main list levels with necessary fields
    const mainListLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      select: {
        id: true,
        name: true,
        placement: true,
        verifier: true, // Need verifier name
        records: true,   // Need records array { username, percent, videoId }
      },
      orderBy: { placement: 'asc' }
    });

    if (mainListLevels.length === 0) {
        console.log("[StatsGen DB] No levels found on main list. Skipping regeneration.");
        return;
    }

    // Create a map for quick level lookup by ID if needed later (though not strictly necessary for this logic)
    // const levelMap = new Map(mainListLevels.map(lvl => [lvl.id, lvl]));

    // 2. Identify all unique player names involved in the main list
    const playerNames = new Set();
    mainListLevels.forEach(level => {
      if (level.verifier) {
        playerNames.add(level.verifier);
      }
      level.records.forEach(record => {
        // Assuming record.percent === 100 means completed for score/hardest
        if (record.username && record.percent === 100) {
            playerNames.add(record.username);
        }
      });
    });

    let playersToProcess = Array.from(playerNames);
    console.log(`[StatsGen DB] Found ${playersToProcess.length} unique player names involved in main list completions/verifications.`);

    // If specific targets were provided, filter the list
    if (targetPlayerNames && Array.isArray(targetPlayerNames)) {
      const targetSet = new Set(targetPlayerNames.map(name => name.toLowerCase())); // Use lowercase for comparison
      playersToProcess = playersToProcess.filter(name => targetSet.has(name.toLowerCase()));
      console.log(`[StatsGen DB] Filtered down to ${playersToProcess.length} target players.`);
    }

    if (playersToProcess.length === 0) {
        console.log("[StatsGen DB] No players to process after filtering.");
        // Still need to update ranks even if no individuals were recalculated
    } else {
        console.log(`[StatsGen DB] Calculating stats for ${playersToProcess.length} players...`);
        const statsToUpsert = [];

        // 3. Calculate stats for each player
        for (const playerName of playersToProcess) {
          let hardestDemon = { name: null, placement: Infinity };
          let totalScore = 0;
          let completedLevelIds = new Set(); // Track completed levels to avoid double counting verifier+record

          // Iterate through levels to find completions for this player
          for (const level of mainListLevels) {
            let isCompletion = false;

            // Check if player verified this level
            if (level.verifier?.toLowerCase() === playerName.toLowerCase()) {
                isCompletion = true;
            }
            // Check if player has a 100% record for this level
            else if (level.records.some(r => r.username?.toLowerCase() === playerName.toLowerCase() && r.percent === 100)) {
                isCompletion = true;
            }

            if (isCompletion && !completedLevelIds.has(level.id)) {
                completedLevelIds.add(level.id); // Mark as completed
                totalScore += calculatePoints(level.placement);

                // Update hardest demon
                if (level.placement < hardestDemon.placement) {
                     if (playerName.toLowerCase() === 'zoink') { // Keep debug log for Zoink
                        console.log(`  [Zoink Debug DB] New Hardest: ${level.name} (#${level.placement}) replacing ${hardestDemon.name} (#${hardestDemon.placement})`);
                     }
                    hardestDemon = { name: level.name, placement: level.placement };
                }
            }
          } // End level loop for player

          if (playerName.toLowerCase() === 'zoink') { // Keep debug log for Zoink
              console.log(`  [Zoink Debug DB] Final Hardest Calculated: ${hardestDemon.name} (#${hardestDemon.placement}) Score: ${totalScore.toFixed(2)}`);
          }

          // Prepare data for upsert into Playerstats collection
          statsToUpsert.push({
            name: playerName, // Use the canonical name found
            list: 'main-list', // Explicitly set list type
            demonlistScore: totalScore,
            hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
            // Rank handled below
          });

        } // End player loop

        // 4. Upsert calculated stats into Playerstats collection
        console.log(`[StatsGen DB] Upserting base stats for ${statsToUpsert.length} players into 'Playerstats' collection...`);
        // Use Promise.all with transaction for potentially better performance
        const upsertOperations = statsToUpsert.map(statData =>
            prisma.playerstats.upsert({ // Use the mapped model name 'Playerstats'
                where: {
                    // Need a unique constraint for upsert. Assuming name+list is unique.
                    // If your schema doesn't enforce this, find first then update/create.
                    // Let's try finding first.
                    // This requires a @@unique([name, list]) index in schema.prisma potentially
                    // For MongoDB, create a unique compound index manually or adjust logic.
                    // Safer approach: Find -> Update/Create
                    name_list: { name: statData.name, list: statData.list } // Assumes compound index/id exists
                },
                update: {
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    updatedAt: new Date(), // Manually set update time if not using @updatedAt
                },
                create: {
                    name: statData.name,
                    list: statData.list,
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    // Add clan: null if needed, rank will be set later
                },
            })
        );
        // If upsert with compound key fails due to lack of index, use find/update/create loop:
        /*
        for (const statData of statsToUpsert) {
            const existing = await prisma.playerstats.findFirst({
                where: { name: statData.name, list: statData.list }
            });
            if (existing) {
                await prisma.playerstats.update({
                    where: { id: existing.id },
                    data: {
                        demonlistScore: statData.demonlistScore,
                        hardestDemonName: statData.hardestDemonName,
                        hardestDemonPlacement: statData.hardestDemonPlacement,
                         updatedAt: new Date(),
                    }
                });
            } else {
                 await prisma.playerstats.create({
                     data: {
                        name: statData.name,
                        list: statData.list,
                        demonlistScore: statData.demonlistScore,
                        hardestDemonName: statData.hardestDemonName,
                        hardestDemonPlacement: statData.hardestDemonPlacement,
                     }
                 });
            }
        }
        */

        // Execute upserts (using transaction is safer if available/needed)
        await Promise.all(upsertOperations); // Try upsert first
        console.log(`[StatsGen DB] Finished upserting base stats.`);
    } // End if playersToProcess > 0

    // --- Always Recalculate and Update Ranks for Main List ---
    console.log('[StatsGen DB] Recalculating all main-list player ranks...');
    // 5. Fetch all playerstats for the main list, ordered by score
    const allMainListStats = await prisma.playerstats.findMany({
      where: { list: 'main-list' },
      orderBy: [ { demonlistScore: 'desc' }, { name: 'asc' } ], // Order by score, then name for ties
      select: { id: true, demonlistScore: true },
    });

    // 6. Update ranks in batches using Prisma $transaction
    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allMainListStats.length; i++) {
        const stat = allMainListStats[i];
        // Only assign rank if score > 0
        const rankToAssign = stat.demonlistScore > 0 ? currentRank++ : null;
        rankUpdates.push(
            prisma.playerstats.update({
                where: { id: stat.id },
                data: { demonlistRank: rankToAssign },
            })
        );
    }
     // Also ensure players with score 0 or less have null rank
    rankUpdates.push(
        prisma.playerstats.updateMany({
            where: { list: 'main-list', demonlistScore: { lte: 0 } },
            data: { demonlistRank: null },
        })
    );


    console.log(`[StatsGen DB] Applying ${rankUpdates.length} rank updates in transaction...`);
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen DB] Finished updating ranks.');
    // --- End Rank Update ---

    console.log('[StatsGen DB] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen DB] Error regenerating player stats:', error);
    // throw error;
  }
}