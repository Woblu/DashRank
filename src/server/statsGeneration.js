// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;
import fs from 'fs';
import path from 'path';

// [FIX] Import the helper function from your utils file
import { loadStaticLists } from './utils/listHelpers.js'; // Adjust path if needed

const prisma = new PrismaClient();

// Helper function to calculate points (remains the same)
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// --- Function to load static main-list.json (REMOVED) ---
// We now import loadStaticLists from listHelpers.js

// --- Main Regeneration Function ---
export async function regeneratePlayerStats(targetPlayerNames = null) {
  console.log(`[StatsGen DB+JSON v2] Starting DB player stats regeneration... Target: ${targetPlayerNames ? targetPlayerNames.join(', ') : 'All Relevant Players'}`);

  try {
    // 1. Fetch CURRENT level placements and IDs from the DATABASE
    const currentDbLevels = await prisma.level.findMany({
      where: { list: 'main-list' }, // Fetch only main list levels from DB
      select: {
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
    // [FIX] Call the imported helper and get the 'main' list
    const staticLists = loadStaticLists();
    const staticMainListData = staticLists.main; // Get the main list from the helper
    
    if (!staticMainListData || staticMainListData.length === 0) {
        console.error("[StatsGen DB+JSON v2] Static main-list.json is empty or failed to load. Cannot determine completions.");
        return; // Stop if we can't get completion data
    }

    // 3. Identify all unique player names from the STATIC JSON completions/verifications
    const playerNames = new Set();
    staticMainListData.forEach(level => {
      if (level.verifier) {
        playerNames.add(level.verifier);
      }
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
    } else {
        console.log(`[StatsGen DB+JSON v2] Calculating stats for ${playersToProcess.length} players...`);
        const statsToUpsert = [];

        // 4. Calculate stats for each player
        for (const playerName of playersToProcess) {
          let hardestDemon = { name: null, placement: Infinity };
          let totalScore = 0;
          let completedLevelNames = new Set(); // Track completed level *names*

          for (const staticLevel of staticMainListData) {
            let isCompletion = false;
            const levelNameLower = staticLevel.name?.toLowerCase();
            if (!levelNameLower) continue;

            if (staticLevel.verifier?.toLowerCase() === playerName.toLowerCase()) {
                isCompletion = true;
            }
            else if (Array.isArray(staticLevel.records) && staticLevel.records.some(r => r.username?.toLowerCase() === playerName.toLowerCase() && r.percent === 100)) {
                isCompletion = true;
            }

            if (isCompletion && !completedLevelNames.has(levelNameLower)) {
                completedLevelNames.add(levelNameLower);
                const currentPlacement = currentPlacementMap.get(levelNameLower);
                if (currentPlacement !== undefined && currentPlacement !== null && typeof currentPlacement === 'number') {
                    totalScore += calculatePoints(currentPlacement);
                    if (currentPlacement < hardestDemon.placement) {
                        hardestDemon = { name: staticLevel.name, placement: currentPlacement };
                    }
                } else {
                    console.warn(`[StatsGen DB+JSON v2] Could not find current placement in DB for completed level from static JSON: ${staticLevel.name}. Skipping score/hardest update for this level.`);
                }
            }
          } // End static level loop

          console.log(`[StatsGen DB+JSON v2] PRE-UPSERT for ${playerName}: Score=${totalScore.toFixed(2)}, Hardest=${hardestDemon.name || 'None'} (#${hardestDemon.placement === Infinity ? 'N/A' : hardestDemon.placement})`);

          statsToUpsert.push({
            name: playerName,
            list: 'main', // Use 'main' to match collection data
            demonlistScore: totalScore,
            hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
          });

        } // End player loop

        // 5. Upsert calculated stats into Playerstats DB collection
        console.log(`[StatsGen DB+JSON v2] Upserting base stats for ${statsToUpsert.length} players into 'Playerstats' collection...`);
        
        const upsertOperations = statsToUpsert.map(statData =>
            prisma.playerstats.upsert({
                where: {
                    name_list: { name: statData.name, list: statData.list }
                },
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
                    clan: null,
                    demonlistRank: null,
                },
            })
        );

        try {
            await prisma.$transaction(upsertOperations);
            console.log(`[StatsGen DB+JSON v2] Finished upserting base stats.`);
        } catch (upsertError) {
             console.error(`[StatsGen DB+JSON v2] ERROR during upsert transaction:`, upsertError);
             // Fallback loop if upsert fails
             console.log("[StatsGen DB+JSON v2] Retrying with find/update/create loop...");
             for (const statData of statsToUpsert) {
                  try {
                      const existing = await prisma.playerstats.findFirst({ where: { name: statData.name, list: statData.list } });
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
        }
    } // End if playersToProcess > 0

    // --- Always Recalculate and Update Ranks for Main List in DB ---
    console.log('[StatsGen DB+JSON v2] Recalculating all main-list player ranks...');
    const allMainListStats = await prisma.playerstats.findMany({
      where: { list: 'main' },
      orderBy: [ { demonlistScore: 'desc' }, { name: 'asc' } ],
      select: { id: true, demonlistScore: true },
    });

    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allMainListStats.length; i++) {
        const stat = allMainListStats[i];
        const rankToAssign = (stat.demonlistScore && stat.demonlistScore > 0) ? currentRank++ : null;
        rankUpdates.push(
            prisma.playerstats.update({
                where: { id: stat.id },
                data: { demonlistRank: rankToAssign },
            })
        );
    }
    rankUpdates.push(
        prisma.playerstats.updateMany({
            where: { list: 'main', demonlistScore: { lte: 0 } },
            data: { demonlistRank: null },
        })
    );

    console.log(`[StatsGen DB+JSON v2] Applying ${rankUpdates.length} rank updates in transaction...`);
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen DB+JSON v2] Finished updating ranks.');

    console.log('[StatsGen DB+JSON v2] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen DB+JSON v2] Error regenerating player stats:', error);
  }
}