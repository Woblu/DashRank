// src/server/playerStatsHandlers.js
import { PrismaClient, RecordStatus } from '@prisma/client';
import fs from 'fs'; // Import the 'fs' module
import path from 'path'; // Import the 'path' module

const prisma = new PrismaClient();

// --- Function to load static list data ---
let staticListsCache = null; // Cache the loaded data

function loadStaticLists() {
    // If cache exists, return it
    if (staticListsCache) {
        return staticListsCache;
    }
    console.log('[PlayerStatsHandler] Loading static list JSON files...');
    try {
        const dataDir = path.resolve(process.cwd(), 'src/data'); // Get absolute path to data directory

        const mainList = JSON.parse(fs.readFileSync(path.join(dataDir, 'main-list.json'), 'utf8'));
        const unratedList = JSON.parse(fs.readFileSync(path.join(dataDir, 'unrated-list.json'), 'utf8'));
        const platformerList = JSON.parse(fs.readFileSync(path.join(dataDir, 'platformer-list.json'), 'utf8'));
        const challengeList = JSON.parse(fs.readFileSync(path.join(dataDir, 'challenge-list.json'), 'utf8'));
        const futureList = JSON.parse(fs.readFileSync(path.join(dataDir, 'future-list.json'), 'utf8'));

        staticListsCache = { // Store in cache
            main: mainList,
            unrated: unratedList,
            platformer: platformerList,
            challenge: challengeList,
            future: futureList
        };
        console.log('[PlayerStatsHandler] Successfully loaded static lists.');
        return staticListsCache;
    } catch (error) {
        console.error('[PlayerStatsHandler] CRITICAL ERROR: Failed to load static list JSON files:', error);
        // If lists fail to load, the helper function won't work.
        // Decide how to handle this - maybe return an empty object or throw?
        // Returning empty object for now to avoid crashing, but lookups will fail.
        return {};
    }
}
// --- End loading function ---

// Helper to find level details using the loaded static lists
const findLevelDetailsByName = (levelName) => {
    const allLists = loadStaticLists(); // Load lists (uses cache after first call)
    if (!levelName || levelName === 'N/A' || Object.keys(allLists).length === 0) return null;

    for (const listType of Object.keys(allLists)) {
        const listData = allLists[listType];
        // Ensure listData is an array before trying to find
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) {
                return { ...level, listType, levelName: level.name };
            }
        } else {
             console.warn(`[PlayerStatsHandler] Static list data for "${listType}" is not an array.`);
        }
    }
    // console.warn(`[PlayerStatsHandler] Static level details not found for name: "${levelName}"`);
    return null;
};


// The actual handler function to be called by api/index.js
export async function getPlayerStats(req, res) {
  // Get player name from the request parameters
  const { playerName } = req.params;

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ message: 'Player name parameter is required.' });
  }

  const decodedPlayerName = decodeURIComponent(playerName);
  console.log(`[PlayerStatsHandler] Fetching stats for: ${decodedPlayerName}`);

  try {
    // 1. Find User and associated PlayerStat
    const user = await prisma.user.findUnique({
      where: { username: decodedPlayerName },
      select: {
        id: true,
        username: true,
        personalRecords: {
          where: { status: 'COMPLETED' }, // Use your enum name
          select: {
            levelId: true,
            levelName: true, // Use name stored on record
          },
        },
        playerStat: {
          select: {
            demonlistScore: true, demonlistRank: true,
            hardestDemonName: true, hardestDemonPlacement: true, updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`[PlayerStatsHandler] User not found: ${decodedPlayerName}`);
      return res.status(404).json({ message: `Player "${decodedPlayerName}" not found.` });
    }

    // 2. Fetch levels verified by this user
    const verifiedLevels = await prisma.level.findMany({
        where: { verifier: decodedPlayerName, list: { not: 'future-list' } },
        select: { id: true, name: true, placement: true, list: true, levelId: true, },
        orderBy: { placement: 'asc' }
    });

    console.log(`[PlayerStatsHandler] Found user: ${user.username}, Verified levels count: ${verifiedLevels.length}`);

    // 3. Construct the response object
    // Note: The frontend PlayerProfile will need the findLevelDetailsByName helper
    //       or this API needs to return the processed lists (beatenByList, verifiedByList)
    //       Let's return the raw data and let the frontend process it using its own helper.
    const responseData = {
      user: {
        id: user.id,
        username: user.username,
        // Send raw records; frontend can use findLevelDetailsByName
        personalRecords: user.personalRecords,
      },
      playerStat: user.playerStat,
      // Send raw verified levels; frontend can use findLevelDetailsByName
      verifiedLevels: verifiedLevels,
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[PlayerStatsHandler] Error fetching data for ${decodedPlayerName}:`, error);
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  }
}