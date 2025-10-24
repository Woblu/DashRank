// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// No need for specific enums here unless used for filtering Levels
const { PrismaClient } = prismaClientPkg;
import fs from 'fs'; // Still needed for loading static lists for linking details
import path from 'path'; // Still needed for loading static lists

const prisma = new PrismaClient();

// --- Static List Loading (remains the same - needed for findLevelDetailsByName) ---
let staticListsCache = null;
function loadStaticLists() {
    if (staticListsCache) return staticListsCache;
    console.log('[PlayerStatsHandler] Loading static list JSON files...');
    try {
        const dataDir = path.resolve(process.cwd(), 'src/data');
        const mainList = JSON.parse(fs.readFileSync(path.join(dataDir, 'main-list.json'), 'utf8'));
        const unratedList = JSON.parse(fs.readFileSync(path.join(dataDir, 'unrated-list.json'), 'utf8'));
        const platformerList = JSON.parse(fs.readFileSync(path.join(dataDir, 'platformer-list.json'), 'utf8'));
        const challengeList = JSON.parse(fs.readFileSync(path.join(dataDir, 'challenge-list.json'), 'utf8'));
        const futureList = JSON.parse(fs.readFileSync(path.join(dataDir, 'future-list.json'), 'utf8'));
        staticListsCache = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
        console.log('[PlayerStatsHandler] Successfully loaded static lists.');
        return staticListsCache;
    } catch (error) {
        console.error('[PlayerStatsHandler] CRITICAL ERROR: Failed to load static list JSON files:', error);
        return {};
    }
}
// Helper using loaded static lists (still potentially useful for frontend linking)
const findLevelDetailsByName = (levelName) => {
    const allLists = loadStaticLists();
    if (!levelName || levelName === 'N/A' || Object.keys(allLists).length === 0) return null;
    for (const listType of Object.keys(allLists)) {
        const listData = allLists[listType];
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) {
                return { ...level, listType, levelName: level.name };
            }
        } else {
             console.warn(`[PlayerStatsHandler] Static list data for "${listType}" is not an array.`);
        }
    }
    return null;
};


// Main handler function - No User model involved
export async function getPlayerStats(req, res) {
  const { playerName } = req.params;
  if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ message: 'Player name parameter is required.' });
  }

  const decodedPlayerName = decodeURIComponent(playerName);
  console.log(`[PlayerStatsHandler] Fetching data for player: ${decodedPlayerName}`);

  try {
    // 1. Fetch the stats document from the 'Playerstats' collection (case-insensitive)
    const playerStatsData = await prisma.playerstats.findFirst({
        where: {
            name: {
                equals: decodedPlayerName,
                mode: 'insensitive'
            },
            // Assuming we primarily care about the main list stats entry for the profile header
            list: 'main-list' // Fetch the main list entry specifically
        },
        select: {
            id: true, demonlistScore: true, demonlistRank: true,
            hardestDemonName: true, hardestDemonPlacement: true,
            name: true, // Get actual casing
            clan: true, list: true, updatedAt: true,
        }
    });

    // Determine the actual name casing to use for further queries
    // Use the name from Playerstats if found, otherwise use the decoded name
    const actualPlayerName = playerStatsData?.name || decodedPlayerName;
    console.log(`[PlayerStatsHandler] Using actual name for queries: ${actualPlayerName}`);


    // 2. Fetch levels verified by this player (case-sensitive using actualPlayerName)
    const verifiedLevels = await prisma.level.findMany({
        where: {
            verifier: actualPlayerName, // Exact match using found/provided name
            list: { not: 'future-list' }
        },
        select: { id: true, name: true, placement: true, list: true, levelId: true, },
        orderBy: { placement: 'asc' }
    });
    console.log(`[PlayerStatsHandler] Found ${verifiedLevels.length} levels verified by ${actualPlayerName}.`);


    // 3. Fetch levels completed (100% record) by this player (case-sensitive)
    // This query looks inside the 'records' array on Level documents.
    // Prisma needs specific syntax for array contains queries with objects.
    // We'll filter for levels containing a record matching the username and 100%.
    const completedLevels = await prisma.level.findMany({
        where: {
            // Filter for levels where the 'records' array contains at least one element
            // that matches the condition { username: actualPlayerName, percent: 100 }
            records: {
                // Using 'some' checks if at least one element in the array matches
                 some: {
                     username: actualPlayerName,
                     percent: 100
                 }
            }
            // Optionally add list filter: list: 'main-list' if needed
        },
        select: { id: true, name: true, placement: true, list: true, levelId: true, },
        orderBy: { placement: 'asc' } // Order completions logically
    });
     console.log(`[PlayerStatsHandler] Found ${completedLevels.length} levels completed (100%) by ${actualPlayerName}.`);


    // 4. Check if we found any data at all
     if (!playerStatsData && verifiedLevels.length === 0 && completedLevels.length === 0) {
         console.log(`[PlayerStatsHandler] No Playerstats, verified, or completed levels found for ${decodedPlayerName}. Returning 404.`);
         return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
     }


    // 5. Construct the response object
    const responseData = {
      // playerStat might be null if the player isn't ranked on the main list but has completions/verifications elsewhere
      playerStat: playerStatsData,
      // Pass the lists of level objects directly
      verifiedLevels: verifiedLevels,
      completedLevels: completedLevels, // Add the completed levels list
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[PlayerStatsHandler] Error fetching data for ${decodedPlayerName}:`, error);
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  }
}