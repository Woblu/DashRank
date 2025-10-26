// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// Destructure PrismaClient and the correct enum name for your record status
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// --- Static List Loading ---
let staticListsCache = null;
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
        // Returning empty object for now to avoid crashing, but lookups will fail.
        return {};
    }
}
// Helper using loaded static lists
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
    // console.warn(`[PlayerStatsHandler] Static level details not found for name: "${levelName}"`); // Keep commented unless needed
    return null;
};


// Main handler function
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    console.log(`[PlayerStatsHandler V3 DEBUG] ========= START Request for: ${decodedPlayerName} =========`);

    // ** DEBUG: Log part of the DB URL to verify connection target **
    try {
        const dbUrl = process.env.DATABASE_URL || "DATABASE_URL not set";
        const safeUrl = dbUrl.replace(/mongodb\+srv:\/\/(.+?):.+@/, 'mongodb+srv://$1:<PASSWORD>@'); // Hide user/pass
        console.log(`[PlayerStatsHandler V3 DEBUG] Connecting to DB indicated by: ${safeUrl}`);
    } catch (e) { console.error("Error checking DB URL", e); }


    let playerStatsData = null;
    let userData = null; // We still might have User accounts separate from Playerstats
    let verifiedLevels = [];
    let completedLevels = [];
    let actualPlayerName = decodedPlayerName; // Default name for queries

    try {
        // --- 1. Attempt Case-Insensitive Playerstats Query ---
        const playerStatsWhere = {
            name: { equals: decodedPlayerName, mode: 'insensitive' },
            list: 'main-list'
        };
        console.log(`[PlayerStatsHandler V3 DEBUG] 1. Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));
        try {
            playerStatsData = await prisma.playerstats.findFirst({
                where: playerStatsWhere,
                select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
            });
            if (playerStatsData) {
                actualPlayerName = playerStatsData.name; // Use exact casing from DB
                console.log(`[PlayerStatsHandler V3 DEBUG]   SUCCESS: Found Playerstats. Actual name: ${actualPlayerName}. Data:`, playerStatsData);
            } else {
                console.log(`[PlayerStatsHandler V3 DEBUG]   INFO: No Playerstats entry found (case-insensitive).`);
                // ** DEBUG: Explicitly try "Zoink" case if input is "zoink" **
                if (decodedPlayerName.toLowerCase() === 'zoink') {
                     console.log(`[PlayerStatsHandler V3 DEBUG]   Retrying Playerstats query with EXACT name "Zoink"`);
                     const exactMatchStats = await prisma.playerstats.findFirst({
                         where: { name: "Zoink", list: 'main-list'}, // Exact case "Zoink"
                         select: { name: true, id: true }
                     });
                     if (exactMatchStats) {
                         console.log(`[PlayerStatsHandler V3 DEBUG]   SUCCESS (Exact Match): Found Playerstats for "Zoink". ID: ${exactMatchStats.id}`);
                         actualPlayerName = "Zoink"; // Force correct case
                         // Re-fetch full data with correct case if needed, or assume first query works if name matches DB
                         playerStatsData = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main-list' }, select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true } });

                     } else {
                          console.log(`[PlayerStatsHandler V3 DEBUG]   INFO (Exact Match): Still no Playerstats found for "Zoink".`);
                     }
                }
            }
        } catch (e) {
            console.error(`[PlayerStatsHandler V3 DEBUG]   ERROR querying Playerstats:`, e);
        }


        // --- 2. Query User (Case-Insensitive) - Still useful if they have an account ---
         console.log(`[PlayerStatsHandler V3 DEBUG] 2. Querying User for username: ${decodedPlayerName} (insensitive)`);
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
                console.log(`[PlayerStatsHandler V3 DEBUG]   SUCCESS: Found User data. Actual name used for next queries: ${actualPlayerName}`);
            } else {
                 console.log(`[PlayerStatsHandler V3 DEBUG]   INFO: No User account found.`);
            }
         } catch (e) {
             console.error(`[PlayerStatsHandler V3 DEBUG]   ERROR querying User:`, e);
         }


        // --- 3. Fetch Verified Levels (Using determined actualPlayerName with correct casing) ---
        const verifiedWhere = { verifier: actualPlayerName }; // Removed list filter for broader debug check
        console.log(`[PlayerStatsHandler V3 DEBUG] 3. Querying Levels verified by WHERE:`, JSON.stringify(verifiedWhere));
        try {
            verifiedLevels = await prisma.level.findMany({
                where: verifiedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true }, // Include verifier for confirmation
                // orderBy: { placement: 'asc' } // Temporarily remove order for simpler query
            });
            console.log(`[PlayerStatsHandler V3 DEBUG]   SUCCESS: Found ${verifiedLevels.length} verified levels.`);
            // Log names if found
            if (verifiedLevels.length > 0) console.log(`[PlayerStatsHandler V3 DEBUG]   Verified level names: ${verifiedLevels.map(l=>l.name).join(', ')}`);
            // ** DEBUG: Log the raw result if specifically looking for Zoink **
             if (decodedPlayerName.toLowerCase() === 'zoink') {
                 console.log(`[PlayerStatsHandler V3 DEBUG]   Raw verified levels result for ${actualPlayerName}:`, JSON.stringify(verifiedLevels.slice(0, 5), null, 2)); // Log first 5
             }

        } catch(e) {
            console.error(`[PlayerStatsHandler V3 DEBUG]   ERROR querying verified levels:`, e);
        }

        // --- 4. Fetch Completed Levels (Using actualPlayerName with correct casing) ---
         const completedWhere = { records: { some: { username: actualPlayerName, percent: 100 }}};
         console.log(`[PlayerStatsHandler V3 DEBUG] 4. Querying Completed Levels with WHERE:`, JSON.stringify(completedWhere));
        try {
            completedLevels = await prisma.level.findMany({
                where: completedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, records: { select: {username:true, percent: true}}}, // Include records for confirmation
                // orderBy: { placement: 'asc' } // Temporarily remove order
            });
            console.log(`[PlayerStatsHandler V3 DEBUG]   SUCCESS: Found ${completedLevels.length} completed levels.`);
             if (completedLevels.length > 0) console.log(`[PlayerStatsHandler V3 DEBUG]   Completed level names: ${completedLevels.map(l=>l.name).join(', ')}`);
             // ** DEBUG: Log the raw result if specifically looking for Zoink **
              if (decodedPlayerName.toLowerCase() === 'zoink') {
                 console.log(`[PlayerStatsHandler V3 DEBUG]   Raw completed levels result for ${actualPlayerName}:`, JSON.stringify(completedLevels.slice(0, 5), null, 2)); // Log first 5
             }
        } catch (e) {
            console.error(`[PlayerStatsHandler V3 DEBUG]   ERROR querying completed levels:`, e);
        }


        // --- 5. Final Check if ANY data was found ---
         if (!playerStatsData && !userData && verifiedLevels.length === 0 && completedLevels.length === 0) {
             console.log(`[PlayerStatsHandler V3 DEBUG] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
             return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
         }

        // --- 6. Calculate Hardest Demon (moved after all data fetches) ---
        let hardestDemonForResponse = null; // Use a different var name
        let hardestPlacement = Infinity;
        // Combine completed and verified for hardest calculation, ensure uniqueness by ID
        const combinedLevels = new Map();
        [...completedLevels, ...verifiedLevels].forEach(level => {
            // Only consider main list levels for hardest
            if (level.list === 'main-list' && !combinedLevels.has(level.id)) {
                combinedLevels.set(level.id, level);
            }
        });

        combinedLevels.forEach(level => {
             // Ensure placement is a valid number before comparing
             if (typeof level.placement === 'number' && level.placement < hardestPlacement) {
                hardestPlacement = level.placement;
                hardestDemonForResponse = level; // Store the full level object found
             }
        });
        console.log(`[PlayerStatsHandler V3 DEBUG] Calculated hardest demon: ${hardestDemonForResponse?.name || 'None'}`);

        // --- 7. Construct Response ---
        const responseData = {
            // Synthesize playerStat if main list entry wasn't found but other data exists
            playerStat: playerStatsData || {
                name: actualPlayerName, // Use the name confirmed/used in queries
                demonlistScore: 0, // Calculate if possible/needed, or default
                demonlistRank: null,
                hardestDemonName: hardestDemonForResponse?.name ?? null,
                hardestDemonPlacement: hardestDemonForResponse?.placement ?? null,
                clan: null, // Default if not found
                list: 'main-list', // Assume main-list context if synthesizing
                updatedAt: null,
            },
            // user: null, // Removed user query result from response
            verifiedLevels: verifiedLevels,
            completedLevels: completedLevels,
        };

        // Ensure hardest demon info in playerStat reflects calculation, even if playerStat was synthesized
        responseData.playerStat.hardestDemonName = hardestDemonForResponse?.name ?? null;
        responseData.playerStat.hardestDemonPlacement = hardestDemonForResponse?.placement ?? null;


        console.log(`[PlayerStatsHandler V3 DEBUG] Sending successful response for ${actualPlayerName}.`);
        return res.status(200).json(responseData);

    } catch (error) { // Catch unexpected errors during the process
        console.error(`[PlayerStatsHandler V3 DEBUG] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}


// --- Helper Functions (Unchanged) ---
function loadStaticLists() {
    if (staticListsCache) { return staticListsCache; }
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