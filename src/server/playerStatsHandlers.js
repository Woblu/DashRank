// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;
import { cleanUsername } from '../utils/scoring.js';
import { loadAllStaticLists } from './utils/listHelpers.js';

const prisma = new PrismaClient();

// Load all static lists (for records/verifiers) ONCE
const allStaticLists = loadAllStaticLists();
const allListsData = {
    main: allStaticLists.mainList,
    unrated: allStaticLists.unratedList,
    platformer: allStaticLists.platformerList,
    challenge: allStaticLists.challengeList,
};

// [NEW] Helper to get all main list levels from the DB
async function getMainListFromDB() {
  return prisma.level.findMany({
    where: { 
      list: 'main-list', 
      // [FIX] Changed `{ not: null }` to `{ gt: 0 }` to avoid Prisma validation error
      placement: { gt: 0 } 
    },
    select: { id: true, name: true, placement: true, levelId: true },
    orderBy: { placement: 'asc' },
  });
}

// [NEW] Helper to get all ranked players and their scores from the DB
// This replaces reading from main-statsviewer.json
async function getAllPlayerStatsFromDB(mainList) {
  const mainListMap = new Map(mainList.map(l => [l.id, l.placement]));
  const playerProfiles = new Map();

  const allLevels = await prisma.level.findMany({
    where: { list: 'main-list', placement: { lte: 150 } },
    select: { id: true, verifier: true, records: { select: { username: true, percent: true } } }
  });

  for (const level of allLevels) {
    const placement = mainListMap.get(level.id);
    if (!placement) continue;
    
    const levelScore = calculateScore(placement);
    
    // Process Verifier
    if (level.verifier) {
      const cleanVerifierName = cleanUsername(level.verifier);
      const profile = getProfile(playerProfiles, cleanVerifierName, level.verifier);
      profile.score += levelScore;
    }

    // Process Records
    if (level.records) {
      const verifierName = cleanUsername(level.verifier);
      for (const record of level.records) {
        if (record.percent === 100) {
          const cleanRecordName = cleanUsername(record.username);
          if (cleanRecordName === verifierName) continue; 

          const profile = getProfile(playerProfiles, cleanRecordName, record.username);
          if (!profile.completedLevelIds.has(level.id)) {
            profile.score += levelScore;
            profile.completedLevelIds.add(level.id); // Track completion
          }
        }
      }
    }
  }

  // Sort, Rank, and Format Data
  const allPlayers = Array.from(playerProfiles.values())
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((player, index) => {
      player.rank = index + 1;
      return player;
    });

  // Create a map for fast lookup by clean name
  return new Map(allPlayers.map(p => [cleanUsername(p.name), p]));
}


// [NEW] Helper to get or create a profile in the map
function getProfile(map, name, originalName) {
  if (!map.has(name)) {
    map.set(name, {
      name: originalName,
      score: 0,
      rank: 0,
      completedLevelIds: new Set(),
    });
  }
  // Update casing if a non-tagged name is found
  if (!map.get(name).name.includes('[')) {
      map.get(name).name = originalName;
  }
  return map.get(name);
}


/**
 * [REWRITTEN] Main handler function
 * This now reads from the database in real-time.
 */
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    const cleanName = cleanUsername(decodedPlayerName.replace(/-/g, ' '));
    
    console.log(`[PlayerStatsHandler v14] ========= START Request for: ${decodedPlayerName} (Cleaned: ${cleanName}) =========`);

    try {
        // --- 1. Fetch all data from the database ---
        // Get the current main list placements
        const mainList = await getMainListFromDB();
        // Get all player ranks and scores, calculated live
        const allPlayerRanksMap = await getAllPlayerStatsFromDB(mainList);

        // --- 2. Find the requested player's stats ---
        const playerRankedStats = allPlayerRanksMap.get(cleanName);
        
        // --- 3. Find this player's verified levels ---
        // [FIX] Check against the *raw* verifier field in the DB, not the clean name
        const verifiedLevels = await prisma.level.findMany({
            where: { 
                verifier: { equals: playerRankedStats?.name || cleanName, mode: 'insensitive' } 
            },
            select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true },
            orderBy: [ { list: 'asc' }, { placement: 'asc' } ]
        });

        // --- 4. Find this player's completed levels ---
        // [FIX] Use the *ranked name* (with tag) if available, otherwise the clean name
        const nameForRecordSearch = playerRankedStats?.name || cleanName;
        const completedLevels = await prisma.level.findMany({
            where: {
                records: {
                    some: {
                        percent: 100,
                        OR: [
                            { username: { equals: nameForRecordSearch, mode: 'insensitive' } },
                            { username: { endsWith: ` ${nameForRecordSearch}`, mode: 'insensitive' } }
                        ]
                    }
                }
            },
            select: { id: true, name: true, placement: true, list: true, levelId: true },
            orderBy: [ { list: 'asc' }, { placement: 'asc' } ]
        });

        // --- 5. Final Check ---
        if (!playerRankedStats && verifiedLevels.length === 0 && completedLevels.length === 0) {
            console.log(`[PlayerStatsHandler v14] FINAL CHECK: No data found for ${cleanName}. Returning 404.`);
            return res.status(404).json({ message: `Player "${cleanName}" not found or has no associated data.` });
        }

        // --- 6. Calculate Hardest Demon from DB data ---
        let hardestDemon = { placement: Infinity, name: null };
        const combinedLevels = new Map();

        // Add completions
        completedLevels.forEach(level => {
            if (level.list === 'main-list') combinedLevels.set(level.id, level);
        });
        // Add verifications (will overwrite completions)
        verifiedLevels.forEach(level => {
            if (level.list === 'main-list') combinedLevels.set(level.id, level);
        });

        combinedLevels.forEach(level => {
            if (level.placement < hardestDemon.placement) {
                hardestDemon = { placement: level.placement, name: level.name };
            }
        });
        
        // --- 7. Construct Response ---
        let playerStat;
        if (playerRankedStats) {
            // Player is ranked
            playerStat = {
                name: playerRankedStats.name, // Use the proper-cased name
                demonlistScore: playerRankedStats.score,
                demonlistRank: playerRankedStats.rank,
                hardestDemonName: hardestDemon.name,
                hardestDemonPlacement: hardestDemon.placement,
                clan: null, // Clan logic can be re-added if needed
                list: 'main',
                updatedAt: new Date().toISOString(),
            };
        } else {
            // Player is not ranked but has completions
            playerStat = {
                name: (verifiedLevels[0]?.verifier || decodedPlayerName), // Best guess at a cased name
                demonlistScore: 0,
                demonlistRank: null,
                hardestDemonName: hardestDemon.name,
                hardestDemonPlacement: hardestDemon.placement,
                clan: null,
                list: 'main',
                updatedAt: new Date().toISOString(),
            };
        }

        const responseData = {
            playerStat,
            verifiedLevels, // [FIX] Pass the DB-queried verified levels
            completedLevels, // [FIX] Pass the DB-queried completed levels
            hardestDemonDisplay: hardestDemon.placement === Infinity ? null : hardestDemon // Pass the calculated hardest
        };

        console.log(`[PlayerStatsHandler v14] Sending successful response for ${cleanName}.`);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error(`[PlayerStatsHandler v14] UNEXPECTED GLOBAL error fetching data for ${cleanName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}