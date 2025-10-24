// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// Destructure PrismaClient and the correct enum name for your record status
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// --- Static List Loading (remains the same) ---
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
const findLevelDetailsByName = (levelName) => {
    const allLists = loadStaticLists();
    if (!levelName || levelName === 'N/A' || Object.keys(allLists).length === 0) return null;
    for (const listType of Object.keys(allLists)) {
        const listData = allLists[listType];
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) { return { ...level, listType, levelName: level.name }; }
        } else { console.warn(`[PlayerStatsHandler] Static list data for "${listType}" is not an array.`); }
    }
    return null;
};

// Main handler function
export async function getPlayerStats(req, res) {
  const { playerName } = req.params;
  if (!playerName || typeof playerName !== 'string') {
     return res.status(400).json({ message: 'Player name parameter is required.' });
   }

  const decodedPlayerName = decodeURIComponent(playerName);
  console.log(`[PlayerStatsHandler DEBUG] Fetching stats for: ${decodedPlayerName}`);

  let playerStatsData = null;
  let userData = null; // We still might have User accounts separate from Playerstats
  let verifiedLevels = [];
  let completedLevels = [];
  let actualPlayerName = decodedPlayerName; // Default to requested name

  try {
    // --- 1. Fetch Playerstats (Case-Insensitive) ---
    console.log(`[PlayerStatsHandler DEBUG] Querying Playerstats for name: ${decodedPlayerName} (insensitive), list: main-list`);
    try {
        playerStatsData = await prisma.playerstats.findFirst({
            where: {
                name: { equals: decodedPlayerName, mode: 'insensitive' },
                list: 'main-list'
            },
            select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
        });
        if (playerStatsData) {
            actualPlayerName = playerStatsData.name; // Use exact casing from DB
            console.log(`[PlayerStatsHandler DEBUG] Found Playerstats data. Actual name: ${actualPlayerName}`);
        } else {
            console.log(`[PlayerStatsHandler DEBUG] No Playerstats entry found.`);
        }
    } catch (e) {
        console.error(`[PlayerStatsHandler DEBUG] Error querying Playerstats:`, e);
    }


    // --- 2. Fetch User (Case-Insensitive) - Still useful if they have an account ---
     console.log(`[PlayerStatsHandler DEBUG] Querying User for username: ${decodedPlayerName} (insensitive)`);
     try {
        userData = await prisma.user.findFirst({
          where: { username: { equals: decodedPlayerName, mode: 'insensitive' }},
          select: { id: true, username: true, personalRecords: {
              where: { status: PersonalRecordProgressStatus.COMPLETED }, // Use correct enum
              select: { levelId: true, levelName: true, },
          }},
        });
        if (userData) {
            // If we didn't get a name from Playerstats, use the User's name casing
            if (!playerStatsData) actualPlayerName = userData.username;
            console.log(`[PlayerStatsHandler DEBUG] Found User data. Actual name: ${actualPlayerName}`);
        } else {
             console.log(`[PlayerStatsHandler DEBUG] No User account found.`);
        }
     } catch (e) {
         console.error(`[PlayerStatsHandler DEBUG] Error querying User:`, e);
     }


    // --- 3. Fetch Verified Levels (Using actualPlayerName with correct casing) ---
    console.log(`[PlayerStatsHandler DEBUG] Querying Levels verified by: ${actualPlayerName} (exact match)`);
     try {
        verifiedLevels = await prisma.level.findMany({
            where: { verifier: actualPlayerName, list: { not: 'future-list' } },
            select: { id: true, name: true, placement: true, list: true, levelId: true },
            orderBy: { placement: 'asc' }
        });
        console.log(`[PlayerStatsHandler DEBUG] Found ${verifiedLevels.length} verified levels.`);
     } catch(e) {
         console.error(`[PlayerStatsHandler DEBUG] Error querying verified levels:`, e);
     }


    // --- 4. Fetch Completed Levels (Using actualPlayerName with correct casing) ---
     console.log(`[PlayerStatsHandler DEBUG] Querying Levels completed by: ${actualPlayerName} (exact match in records)`);
     try {
        completedLevels = await prisma.level.findMany({
            where: { records: { some: { username: actualPlayerName, percent: 100 }}},
            select: { id: true, name: true, placement: true, list: true, levelId: true },
            orderBy: { placement: 'asc' }
        });
         console.log(`[PlayerStatsHandler DEBUG] Found ${completedLevels.length} completed levels.`);
     } catch (e) {
          console.error(`[PlayerStatsHandler DEBUG] Error querying completed levels:`, e);
     }


    // --- 5. Check if ANY data was found ---
     if (!playerStatsData && !userData && verifiedLevels.length === 0 && completedLevels.length === 0) {
         console.log(`[PlayerStatsHandler DEBUG] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
         return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
     }

    // --- 6. Construct Response ---
    const responseData = {
      user: userData ? { id: userData.id, username: userData.username, personalRecords: userData.personalRecords } : null,
      playerStat: playerStatsData,
      verifiedLevels: verifiedLevels,
      completedLevels: completedLevels,
    };
    console.log(`[PlayerStatsHandler DEBUG] Sending successful response for ${actualPlayerName}.`);
    return res.status(200).json(responseData);

  } catch (error) { // Catch unexpected errors during the process
    console.error(`[PlayerStatsHandler DEBUG] UNEXPECTED error fetching data for ${decodedPlayerName}:`, error);
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  }
}