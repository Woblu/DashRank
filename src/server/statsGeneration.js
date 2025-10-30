// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg; // Only need PrismaClient here now
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to calculate points (remains the same)
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// --- Function to load static main-list.json ---
let staticMainListCache = null;
function loadStaticMainList() {
    if (staticMainListCache) return staticMainListCache;
    console.log('[StatsGen DB+JSON v2] Loading static main-list.json...');
    try {
        // Resolve path relative to the current file or project root
        // Using process.cwd() is generally safer for server environments
        const filePath = path.resolve(process.cwd(), 'src/data/main-list.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        staticMainListCache = JSON.parse(fileContent);
        console.log(`[StatsGen DB+JSON v2] Successfully loaded static main-list.json with ${staticMainListCache.length} levels.`);
        return staticMainListCache;
    } catch (error) {
        console.error('[StatsGen DB+JSON v2] CRITICAL ERROR: Failed to load static main-list.json:', error);
        return []; // Return empty array on failure
    }
}
// --- End loading function ---


// --- Main Regeneration Function ---
export async function regeneratePlayerStats(targetPlayerNames = null) {
  console.log(`[StatsGen DB+JSON v2] Starting DB player stats regeneration... Target: ${targetPlayerNames ? targetPlayerNames.join(', ') : 'All Relevant Players'}`);

  try {
    // 1. Fetch CURRENT level placements and IDs from the DATABASE
    const currentDbLevels = await prisma.level.findMany({
      where: { list: 'main-list' }, // Fetch only main list levels from DB
      select: {
        // id: true,    // Prisma ID (might not be needed if matching by name)
        name: true,     // Name (for matching with static JSON)
        placement: true // CURRENT placement
      },
      orderBy: { placement: 'asc' }
    });

    if (currentDbLevels.length === 0) {
        console.log("[StatsGen DB+JSON v2] No levels found in DB for main-list. Skipping regeneration.");
        return;
    }
    // Create a map for quick lookup of CURRENT placement by level name (case-insensitive)
    const currentPlacementMap = new Map(currentDbLevels.map(lvl => [lvl.name.toLowerCase(), lvl.placement]));
    console.log('[StatsGen DB+JSON v2] Current Placements Map Snippet (First 5):', Array.from(currentPlacementMap.entries()).slice(0, 5));


    // 2. Load the STATIC main-list.json to get completion data (verifier, records)
    const staticMainListData = loadStaticMainList();
    if (staticMainListData.length === 0) {
        console.error("[StatsGen DB+JSON v2] Static main-list.json is empty or failed to load. Cannot determine completions.");
        return; // Stop if we can't get completion data
    }

    // 3. Identify all unique player names from the STATIC JSON completions/verifications
    const playerNames = new Set();
    staticMainListData.forEach(level => {
      // Add verifier if present
      if (level.verifier) {
        playerNames.add(level.verifier);
      }
      // Add players from records array if present and criteria met (100%)
      if (Array.isArray(level.records)) {
          level.records.forEach(record => {
            if (record.username && record.percent === 100) {
                playerNames.add(record.username);
            }
          });
      }
    });

    let playersToProcess = Array.from(playerNames);
    console.log(`[StatsGen DB+JSON v2] Found ${playersToProcess.length} unique player names in static main-list completions/verifications.`);

    // Filter list if specific targets were provided
    if (targetPlayerNames && Array.isArray(targetPlayerNames) && targetPlayerNames.length > 0) {
      const targetSet = new Set(targetPlayerNames.map(name => name.toLowerCase())); // Use lowercase for comparison
      playersToProcess = playersToProcess.filter(name => targetSet.has(name.toLowerCase()));
      console.log(`[StatsGen DB+JSON v2] Filtered down to ${playersToProcess.length} target players.`);
    }

    if (playersToProcess.length === 0) {
        console.log("[StatsGen DB+JSON v2] No players to process after filtering (or none found).");
        // Proceed to rank update even if no individuals calculated
    } else {
        console.log(`[StatsGen DB+JSON v2] Calculating stats for ${playersToProcess.length} players...`);
        const statsToUpsert = [];

        // 4. Calculate stats for each player using STATIC completions and CURRENT placements
        for (const playerName of playersToProcess) {
          let hardestDemon = { name: null, placement: Infinity };
          let totalScore = 0;
          let completedLevelNames = new Set(); // Track completed level *names*

          // Iterate through the STATIC list data to find completions for this player
          for (const staticLevel of staticMainListData) {
            let isCompletion = false;
            const levelNameLower = staticLevel.name?.toLowerCase(); // Use optional chaining for safety

            // Skip if level name is missing
            if (!levelNameLower) continue;

            // Check if player verified this level (case-insensitive)
            if (staticLevel.verifier?.toLowerCase() === playerName.toLowerCase()) {
                isCompletion = true;
            }
            // Check if player has a 100% record for this level (case-insensitive)
            else if (Array.isArray(staticLevel.records) && staticLevel.records.some(r => r.username?.toLowerCase() === playerName.toLowerCase() && r.percent === 100)) {
                isCompletion = true;
            }

            // If completed and not already counted for this player
            if (isCompletion && !completedLevelNames.has(levelNameLower)) {
                completedLevelNames.add(levelNameLower);

                // Get the CURRENT placement from the database map
                const currentPlacement = currentPlacementMap.get(levelNameLower);

                // Ensure placement exists and is a number before using it
                if (currentPlacement !== undefined && currentPlacement !== null && typeof currentPlacement === 'number') {
                    totalScore += calculatePoints(currentPlacement);

                    // Update hardest demon based on CURRENT placement
                    if (currentPlacement < hardestDemon.placement) {
                        hardestDemon = { name: staticLevel.name, placement: currentPlacement }; // Use static name, current placement
                    }
                } else {
                    console.warn(`[StatsGen DB+JSON v2] Could not find current placement in DB for completed level from static JSON: ${staticLevel.name}. Skipping score/hardest update for this level.`);
                }
            }
          } // End static level loop for player

          // Log calculated stats before preparing upsert data
          console.log(`[StatsGen DB+JSON v2] PRE-UPSERT for ${playerName}: Score=${totalScore.toFixed(2)}, Hardest=${hardestDemon.name || 'None'} (#${hardestDemon.placement === Infinity ? 'N/A' : hardestDemon.placement})`);

          // Prepare data for upsert into Playerstats collection
          statsToUpsert.push({
            name: playerName, // Use the canonical name found from static file iteration
            list: 'main', // Use 'main' to match collection data
            demonlistScore: totalScore,
            hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
            // Rank will be updated later
          });

        } // End player loop

        // 5. Upsert calculated stats into Playerstats DB collection
        console.log(`[StatsGen DB+JSON v2] Upserting base stats for ${statsToUpsert.length} players into 'Playerstats' collection...`);
        // Use Promise.all with transaction is generally safer for bulk operations
        // Ensure your schema has @@unique([name, list]) for this upsert pattern
        const upsertOperations = statsToUpsert.map(statData =>
            prisma.playerstats.upsert({
                where: {
                    // Use the compound unique identifier defined in schema.prisma
                    name_list: { name: statData.name, list: statData.list }
                },
                update: { // Fields to update if record exists
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    updatedAt: new Date(), // Manually set update time
                },
                create: { // Fields to set if record is created
                    name: statData.name,
                    list: statData.list,
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    // Initialize other fields like clan, rank as needed
                    clan: null,
                    demonlistRank: null,
                    // updatedAt will be set automatically by @updatedAt or manually above
                },
            })
        );

        // Execute upserts
        try {
            await prisma.$transaction(upsertOperations); // Group upserts into a transaction
            console.log(`[StatsGen DB+JSON v2] Finished upserting base stats.`);
        } catch (upsertError) {
             console.error(`[StatsGen DB+JSON v2] ERROR during upsert transaction:`, upsertError);
             // If error is due to missing unique index, log a specific warning
             if (upsertError.message?.includes('Unique constraint failed')) {
                  console.error(">>> Prisma upsert failed likely due to missing '@@unique([name, list])' index on 'Playerstats' model or in the MongoDB collection. Please add the index. Falling back to find/update/create loop (slower). <<<");
                  // Fallback: Loop and update/create individually (slower)
                  console.log("[StatsGen DB+JSON v2] Retrying with find/update/create loop...");
                  for (const statData of statsToUpsert) {
                       try {
                           const existing = await prisma.playerstats.findFirst({ where: { name: statData.name, list: statData.list } });
                           if (existing) {
                               await prisma.playerstats.update({
                                   where: { id: existing.id }, // Use actual ID for update
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
                                        name: statData.name, list: statData.list,
                                        demonlistScore: statData.demonlistScore,
                                        hardestDemonName: statData.hardestDemonName,
                                        hardestDemonPlacement: statData.hardestDemonPlacement,
                                        clan: null, demonlistRank: null,
                                    }
                                });
                           }
                       } catch (loopError) {
                            console.error(`[StatsGen DB+JSON v2] Error during fallback update/create for ${statData.name}:`, loopError);
                       }
                  }
                   console.log(`[StatsGen DB+JSON v2] Finished fallback loop.`);

             } else {
                  throw upsertError; // Re-throw other errors
             }
        }
    } // End if playersToProcess > 0

    // --- Always Recalculate and Update Ranks for Main List in DB ---
    console.log('[StatsGen DB+JSON v2] Recalculating all main-list player ranks...');
    // Fetch all playerstats for the 'main' list, ordered by score
    const allMainListStats = await prisma.playerstats.findMany({
      where: { list: 'main' }, // Use 'main'
      orderBy: [ { demonlistScore: 'desc' }, { name: 'asc' } ], // Order by score, then name for ties
      select: { id: true, demonlistScore: true }, // Select only necessary fields
    });

    // Prepare rank update operations
    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allMainListStats.length; i++) {
        const stat = allMainListStats[i];
        // Assign rank only if score is positive
        const rankToAssign = (stat.demonlistScore && stat.demonlistScore > 0) ? currentRank++ : null;
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
            where: { list: 'main', demonlistScore: { lte: 0 } }, // Use 'main'
            data: { demonlistRank: null },
        })
    );

    console.log(`[StatsGen DB+JSON v2] Applying ${rankUpdates.length} rank updates in transaction...`);
    // Execute all rank updates in a single transaction
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen DB+JSON v2] Finished updating ranks.');
    // --- End Rank Update ---

    console.log('[StatsGen DB+JSON v2] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen DB+JSON v2] Error regenerating player stats:', error);
    // throw error; // Optional: re-throw to signal failure to the caller
  } finally {
      // It's generally recommended *not* to manually disconnect in serverless functions
      // Prisma handles connection pooling. Uncomment only if you face specific issues.
      // await prisma.$disconnect();
  }
}