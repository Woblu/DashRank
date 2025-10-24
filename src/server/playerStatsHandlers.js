// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client'; // Default import
// Destructure PrismaClient and the correct enum name for your record status
// **Important:** Double-check your schema.prisma for the exact enum name. Using 'PersonalRecordProgressStatus' based on previous schema.
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// --- Function to load static list data ---
let staticListsCache = null;

function loadStaticLists() {
    if (staticListsCache) {
        return staticListsCache;
    }
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
        return {}; // Return empty to avoid crash, lookups will fail
    }
}
// --- End loading function ---

// Helper using loaded static lists
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
    // console.warn(`[PlayerStatsHandler] Static level details not found for name: "${levelName}"`); // Keep commented unless needed
    return null;
};

// Main handler function
export async function getPlayerStats(req, res) {
  // Get player name from the request parameters (will be set by the router in index.js)
  const { playerName } = req.params;

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ message: 'Player name parameter is required.' });
  }

  const decodedPlayerName = decodeURIComponent(playerName);
  console.log(`[PlayerStatsHandler] Fetching stats for: ${decodedPlayerName}`);

  try {
    // [FIX] Use findFirst with case-insensitive search
    const user = await prisma.user.findFirst({
      where: {
        // Use 'equals' with 'insensitive' mode for case-insensitivity
        username: {
          equals: decodedPlayerName,
          mode: 'insensitive' // Add this for case-insensitivity
        }
      },
      select: { // Keep selections the same
        id: true,
        username: true, // Fetch the actual username case from DB
        personalRecords: {
          where: {
              // Use the CORRECT destrutured enum value from YOUR schema
              status: PersonalRecordProgressStatus.COMPLETED,
           },
          select: { levelId: true, levelName: true, },
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
      console.log(`[PlayerStatsHandler] User not found (case-insensitive): ${decodedPlayerName}`); // Update log message
      return res.status(404).json({ message: `Player "${decodedPlayerName}" not found.` });
    }

    // --- Fetch verified levels (remains the same) ---
    // Make sure this query also uses the correct username casing from the found user object
    const verifiedLevels = await prisma.level.findMany({
        where: {
             verifier: user.username, // Use the actual username from the found user
             list: { not: 'future-list' }
        },
        select: { id: true, name: true, placement: true, list: true, levelId: true, },
        orderBy: { placement: 'asc' }
    });

    console.log(`[PlayerStatsHandler] Found user: ${user.username}, Verified levels count: ${verifiedLevels.length}`);

    // --- Construct response (remains the same) ---
    const responseData = {
      user: { id: user.id, username: user.username, personalRecords: user.personalRecords, },
      playerStat: user.playerStat,
      verifiedLevels: verifiedLevels,
    };
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[PlayerStatsHandler] Error fetching data for ${decodedPlayerName}:`, error);
     // Check if the error is specifically about the enum value again
    if (error.message?.includes('Expected PersonalRecordProgressStatus')) {
        console.error(">>> Double-check the enum name 'PersonalRecordProgressStatus' matches schema.prisma exactly! <<<");
    }
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  }
}