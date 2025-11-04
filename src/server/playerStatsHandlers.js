// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;

// [FIX] Import the scoring utility AND the list helper
import { calculateScore, cleanUsername } from '../utils/scoring.js';
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
      placement: { gt: 0 } // Use { gt: 0 } instead of { not: null }
    },
    select: { id: true, name: true, placement: true, levelId: true },
    orderBy: { placement: 'asc' },
  });
}

// [NEW] Helper to get all ranked players and their scores from the DB
async function getAllPlayerStatsFromDB(mainList) {
  const mainListMap = new Map(mainList.map(l => [l.id, l.placement]));
  const playerProfiles = new Map();

  // [FIX] This needs to read from the STATIC LIST JSONs, not the DB 'records' field
  // Loop through the static lists to find verifiers and record holders
  for (const level of allListsData.main) {
    // Only check levels that are on the main list in the DB
    const dbInfo = mainList.find(l => l.name.toLowerCase() === level.name.toLowerCase());
    if (!dbInfo || !dbInfo.placement || dbInfo.placement > 150) continue;

    const levelScore = calculateScore(dbInfo.placement);
    
    // Process Verifier
    if (level.verifier) {
      const cleanVerifierName = cleanUsername(level.verifier);
      const profile = getProfile(playerProfiles, cleanVerifierName, level.verifier);
      // Add score only once per level
      if (!profile.completedLevelIds.has(dbInfo.id)) {
        profile.score += levelScore;
        profile.completedLevelIds.add(dbInfo.id); // Add to set to prevent double points
      }
    }

    // Process Records (from static JSON)
    if (level.records) {
      const verifierName = cleanUsername(level.verifier);
      for (const record of level.records) {
        if (record.percent === 100) {
          const cleanRecordName = cleanUsername(record.username);
          if (cleanRecordName === verifierName) continue; 

          const profile = getProfile(playerProfiles, cleanRecordName, record.username);
          if (!profile.completedLevelIds.has(dbInfo.id)) {
            profile.score += levelScore;
            profile.completedLevelIds.add(dbInfo.id); // Track completion
          }
        }
      }
    }
  }

  // Sort, Rank, and Format Data
  const allPlayers = Array.from(playerProfiles.values())
    .filter(p => p.score > 0) // Only rank players with score
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
 */
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    const cleanName = cleanUsername(decodedPlayerName.replace(/-/g, ' '));
    
    console.log(`[PlayerStatsHandler v15] ========= START Request for: ${decodedPlayerName} (Cleaned: ${cleanName}) =========`);

    try {
        // --- 1. Fetch all data from the database ---
        // Get the current main list placements
        const mainListFromDB = await getMainListFromDB();
        
        // [FIX] Get all player ranks and scores, calculated from STATIC JSONS + DB PLACEMENTS
        const allPlayerRanksMap = await getAllPlayerStatsFromDB(mainListFromDB);

        // --- 2. Find the requested player's stats ---
        const playerRankedStats = allPlayerRanksMap.get(cleanName);
        
        // Get correct name casing if available
        const canonicalName = playerRankedStats?.name || decodedPlayerName;
        console.log(`[PlayerStatsHandler v15] Canonical name for logic: ${canonicalName}`);

        // --- 3. Get Correct Placements from DB ---
        const dbLevelMap = new Map();
        for (const level of mainListFromDB) {
            dbLevelMap.set(level.name.toLowerCase(), level);
        }
        console.log(`[PlayerStatsHandler v15] Loaded ${dbLevelMap.size} level placements from DB.`);

        // --- 4. Scan Static JSONs for Completions & Verifications ---
        const tempVerifiedByList = {};
        const tempBeatenByList = {};
        const verifiedLevelNames = new Set();
        let hardestDemon = { placement: Infinity, name: null, levelId: null, id: null, listType: null };

        console.log(`[PlayerStatsHandler v15] Scanning static JSONs for '${cleanName}'...`);
        
        for (const listType in allListsData) {
            const staticLevels = allListsData[listType];
            if (!Array.isArray(staticLevels)) continue;

            for (const level of staticLevels) {
                if (!level.name) continue; // Skip levels without a name
                const levelNameLower = level.name.toLowerCase();
                
                // Get correct placement from DB if it exists
                const dbLevelInfo = dbLevelMap.get(levelNameLower);
                const currentPlacement = dbLevelInfo?.placement || level.placement;
                const currentLevelId = dbLevelInfo?.levelId || level.levelId;
                const currentDbId = dbLevelInfo?.id || level.id;

                const levelData = {
                  name: level.name,
                  id: currentDbId,
                  levelId: currentLevelId,
                  placement: currentPlacement,
                  listType: listType,
                  levelName: level.name
                };

                // Check Verifications
                if (cleanUsername(level.verifier) === cleanName) {
                    if (!tempVerifiedByList[listType]) tempVerifiedByList[listType] = [];
                    tempVerifiedByList[listType].push(levelData);
                    verifiedLevelNames.add(levelNameLower);
                    
                    if (listType === 'main' && currentPlacement && currentPlacement < hardestDemon.placement) {
                        hardestDemon = levelData;
                    }
                }
                // Check Completions
                else if (level.records && Array.isArray(level.records)) {
                    const isCompleted = level.records.some(
                        r => r.percent === 100 && cleanUsername(r.username) === cleanName
                    );
                    
                    if (isCompleted && !verifiedLevelNames.has(levelNameLower)) {
                        if (!tempBeatenByList[listType]) tempBeatenByList[listType] = [];
                        tempBeatenByList[listType].push(levelData);

                        if (listType === 'main' && currentPlacement && currentPlacement < hardestDemon.placement) {
                            hardestDemon = levelData;
                        }
                    }
                }
            }
        }
        
        // Sort all lists by placement
        Object.values(tempBeatenByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
        Object.values(tempVerifiedByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));

        console.log(`[PlayerStatsHandler v15] Found ${Object.keys(tempBeatenByList).length} completed lists.`);
        console.log(`[PlayerStatsHandler v15] Found ${Object.keys(tempVerifiedByList).length} verified lists.`);
        console.log(`[PlayerStatsHandler v15] Calculated hardest demon: ${hardestDemon.name || 'None'} (#${hardestDemon.placement || 'N/A'})`);

        // --- 5. Final Check ---
        if (!playerRankedStats && Object.keys(tempBeatenByList).length === 0 && Object.keys(tempVerifiedByList).length === 0) {
            console.log(`[PlayerStatsHandler v15] FINAL CHECK: No data found for ${cleanName}. Returning 404.`);
            return res.status(404).json({ message: `Player "${cleanName}" not found or has no associated data.` });
        }

        // --- 6. Construct Response ---
        const playerStat = {
            name: canonicalName, // Use the proper-cased name
            demonlistScore: playerRankedStats?.score || 0,
            demonlistRank: playerRankedStats?.rank || null,
            hardestDemonName: hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
            clan: null, // Clan logic can be re-added if needed
            list: 'main',
            updatedAt: new Date().toISOString(),
        };

        const responseData = {
            playerStat,
            beatenByList: tempBeatenByList,
            verifiedByList: tempVerifiedByList,
            hardestDemonDisplay: hardestDemon.placement === Infinity ? null : hardestDemon
        };

        console.log(`[PlayerStatsHandler v15] Sending successful response for ${cleanName}.`);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error(`[PlayerStatsHandler v15] UNEXPECTED GLOBAL error fetching data for ${cleanName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}