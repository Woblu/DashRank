// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;
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
    console.log('[StatsGen DB+JSON] Loading static main-list.json...');
    try {
        const filePath = path.resolve(process.cwd(), 'src/data/main-list.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        staticMainListCache = JSON.parse(fileContent);
        console.log(`[StatsGen DB+JSON] Successfully loaded static main-list.json with ${staticMainListCache.length} levels.`);
        return staticMainListCache;
    } catch (error) {
        console.error('[StatsGen DB+JSON] CRITICAL ERROR: Failed to load static main-list.json:', error);
        return []; // Return empty array on failure
    }
}
// --- End loading function ---


// --- Main Regeneration Function ---
export async function regeneratePlayerStats(targetPlayerNames = null) {
  console.log(`[StatsGen DB+JSON] Starting DB player stats regeneration... ${targetPlayerNames ? `Targeting ${targetPlayerNames.length} players.` : 'Targeting all relevant players.'}`);

  try {
    // 1. Fetch CURRENT level placements and IDs from the DATABASE
    const currentDbLevels = await prisma.level.findMany({
      where: { list: 'main-list' },
      select: {
        id: true,       // Prisma ID
        name: true,     // Name (for matching)
        placement: true // CURRENT placement
      },
      orderBy: { placement: 'asc' }
    });

    if (currentDbLevels.length === 0) {
        console.log("[StatsGen DB+JSON] No levels found in DB for main-list. Skipping regeneration.");
        return;
    }
    // Create a map for quick lookup of CURRENT placement by level name (case-insensitive)
    const currentPlacementMap = new Map(currentDbLevels.map(lvl => [lvl.name.toLowerCase(), lvl.placement]));
    console.log('[StatsGen DB+JSON] Current Placements Map Snippet (First 5):', Array.from(currentPlacementMap.entries()).slice(0, 5));


    // 2. Load the STATIC main-list.json to get completion data (verifier, records)
    const staticMainListData = loadStaticMainList();
    if (staticMainListData.length === 0) {
        console.error("[StatsGen DB+JSON] Static main-list.json is empty or failed to load. Cannot determine completions.");
        return; // Stop if we can't get completion data
    }

    // 3. Identify all unique player names from the STATIC JSON
    const playerNames = new Set();
    staticMainListData.forEach(level => {
      if (level.verifier) {
        playerNames.add(level.verifier);
      }
      // Ensure records is an array before iterating
      if (Array.isArray(level.records)) {
          level.records.forEach(record => {
            // Check completion criteria (e.g., 100%)
            if (record.username && record.percent === 100) {
                playerNames.add(record.username);
            }
          });
      }
    });

    let playersToProcess = Array.from(playerNames);
    console.log(`[StatsGen DB+JSON] Found ${playersToProcess.length} unique player names in static main-list completions/verifications.`);

    // Filter if specific targets were provided
    if (targetPlayerNames && Array.isArray(targetPlayerNames)) {
      const targetSet = new Set(targetPlayerNames.map(name => name.toLowerCase()));
      playersToProcess = playersToProcess.filter(name => targetSet.has(name.toLowerCase()));
      console.log(`[StatsGen DB+JSON] Filtered down to ${playersToProcess.length} target players.`);
    }

    if (playersToProcess.length === 0) {
        console.log("[StatsGen DB+JSON] No players to process.");
    } else {
        console.log(`[StatsGen DB+JSON] Calculating stats for ${playersToProcess.length} players...`);
        const statsToUpsert = [];

        // 4. Calculate stats for each player using STATIC completions and CURRENT placements
        for (const playerName of playersToProcess) {
          let hardestDemon = { name: null, placement: Infinity };
          let totalScore = 0;
          let completedLevelNames = new Set(); // Track completed level *names*

          // Iterate through the STATIC list data to find completions
          for (const staticLevel of staticMainListData) {
            let isCompletion = false;
            const levelNameLower = staticLevel.name.toLowerCase();

            // Check verifier
            if (staticLevel.verifier?.toLowerCase() === playerName.toLowerCase()) {
                isCompletion = true;
            }
            // Check records (assuming 100%)
            else if (Array.isArray(staticLevel.records) && staticLevel.records.some(r => r.username?.toLowerCase() === playerName.toLowerCase() && r.percent === 100)) {
                isCompletion = true;
            }

            // If completed and not already counted
            if (isCompletion && !completedLevelNames.has(levelNameLower)) {
                completedLevelNames.add(levelNameLower);

                // Get the CURRENT placement from the database map
                const currentPlacement = currentPlacementMap.get(levelNameLower);

                if (currentPlacement !== undefined && currentPlacement !== null) {
                    totalScore += calculatePoints(currentPlacement);

                    // Update hardest demon based on CURRENT placement
                    if (currentPlacement < hardestDemon.placement) {
                        hardestDemon = { name: staticLevel.name, placement: currentPlacement }; // Use static name, current placement
                    }
                } else {
                    console.warn(`[StatsGen DB+JSON] Could not find current placement for completed level: ${staticLevel.name}. Skipping score/hardest update for this level.`);
                }
            }
          } // End static level loop for player

          // Debug log for Zoink
          if (playerName.toLowerCase() === 'zoink') {
              console.log(`  [Zoink Debug DB+JSON] Final Hardest: ${hardestDemon.name} (#${hardestDemon.placement}) Score: ${totalScore.toFixed(2)}`);
          }

          // Prepare data for upsert into Playerstats collection
          statsToUpsert.push({
            name: playerName,
            list: 'main-list',
            demonlistScore: totalScore,
            hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
          });

        } // End player loop

        // 5. Upsert calculated stats into Playerstats DB collection
        console.log(`[StatsGen DB+JSON] Upserting base stats for ${statsToUpsert.length} players into 'Playerstats' collection...`);
        const upsertOperations = statsToUpsert.map(statData =>
            prisma.playerstats.upsert({
                where: { name_list: { name: statData.name, list: statData.list } }, // Assumes @@unique([name, list])
                update: {
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    updatedAt: new Date(),
                },
                create: {
                    name: statData.name,
                    list: statData.list,
                    demonlistScore: statData.demonlistScore,
                    hardestDemonName: statData.hardestDemonName,
                    hardestDemonPlacement: statData.hardestDemonPlacement,
                    // clan: null, // Initialize other fields if needed
                },
            })
        );
        // Fallback find/update/create loop if upsert fails on unique constraint:
        /*
        for (const statData of statsToUpsert) {
           const existing = await prisma.playerstats.findFirst({where: { name: statData.name, list: statData.list }});
           if (existing) { await prisma.playerstats.update({ where: { id: existing.id }, data: { ... }}); }
           else { await prisma.playerstats.create({ data: { ... } }); }
        }
        */
        await Promise.all(upsertOperations); // Execute upserts
        console.log(`[StatsGen DB+JSON] Finished upserting base stats.`);
    }

    // --- Always Recalculate and Update Ranks for Main List in DB ---
    console.log('[StatsGen DB+JSON] Recalculating all main-list player ranks...');
    const allMainListStats = await prisma.playerstats.findMany({
      where: { list: 'main-list' },
      orderBy: [ { demonlistScore: 'desc' }, { name: 'asc' } ],
      select: { id: true, demonlistScore: true },
    });

    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allMainListStats.length; i++) {
        const stat = allMainListStats[i];
        const rankToAssign = stat.demonlistScore > 0 ? currentRank++ : null;
        rankUpdates.push(
            prisma.playerstats.update({ where: { id: stat.id }, data: { demonlistRank: rankToAssign } })
        );
    }
    rankUpdates.push(
        prisma.playerstats.updateMany({ where: { list: 'main-list', demonlistScore: { lte: 0 } }, data: { demonlistRank: null } })
    );

    console.log(`[StatsGen DB+JSON] Applying ${rankUpdates.length} rank updates in transaction...`);
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen DB+JSON] Finished updating ranks.');
    // --- End Rank Update ---

    console.log('[StatsGen DB+JSON] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen DB+JSON] Error regenerating player stats:', error);
    // throw error; // Optional: re-throw to signal failure
  } finally {
      // Optional: Disconnect prisma client if needed in your environment
      // await prisma.$disconnect();
  }
}