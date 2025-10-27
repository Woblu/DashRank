// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// Destructure PrismaClient and the correct enum name for your record status
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;

// [FIX] Import helpers from the new file
import { loadStaticLists, findLevelDetailsByName } from './utils/listHelpers.js'; // Adjust path if needed

const prisma = new PrismaClient();

// Main handler function
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    console.log(`[PlayerStatsHandler] ========= START Request for: ${decodedPlayerName} =========`);

    // ** DEBUG Log DB URL **
    try {
        const dbUrl = process.env.DATABASE_URL || "DATABASE_URL not set";
        const safeUrl = dbUrl.replace(/mongodb\+srv:\/\/(.+?):.+@/, 'mongodb+srv://$1:<PASSWORD>@'); // Hide user/pass
        console.log(`[PlayerStatsHandler] Connecting to DB indicated by: ${safeUrl}`);
    } catch (e) { console.error("Error checking DB URL", e); }


    let playerStatsData = null;
    let verifiedLevels = [];
    let completedLevels = [];
    let actualPlayerName = decodedPlayerName; // Default name for queries

    try {
        // --- 1. Attempt Case-Insensitive Playerstats Query ---
        const playerStatsWhere = {
            name: { equals: decodedPlayerName, mode: 'insensitive' },
            list: 'main-list'
        };
        console.log(`[PlayerStatsHandler] 1. Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));
        try {
            playerStatsData = await prisma.playerstats.findFirst({
                where: playerStatsWhere,
                select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
            });
            if (playerStatsData) {
                actualPlayerName = playerStatsData.name; // Use exact casing from DB
                console.log(`[PlayerStatsHandler]   SUCCESS: Found Playerstats. Actual name: ${actualPlayerName}. Data:`, playerStatsData);
            } else {
                console.log(`[PlayerStatsHandler]   INFO: No Playerstats entry found (case-insensitive).`);
                // Explicit "Zoink" check can remain if needed for debugging specific case issues
                if (decodedPlayerName.toLowerCase() === 'zoink') {
                    console.log(`[PlayerStatsHandler]   Retrying Playerstats query with EXACT name "Zoink"`);
                    const exactMatchStats = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main-list'}, select: { name: true, id: true } });
                    if (exactMatchStats) {
                         console.log(`[PlayerStatsHandler]   SUCCESS (Exact Match): Found Playerstats for "Zoink".`);
                         actualPlayerName = "Zoink"; // Force correct case
                         playerStatsData = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main-list' }, select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true } });
                    } else { console.log(`[PlayerStatsHandler]   INFO (Exact Match): Still no Playerstats found for "Zoink".`); }
                }
            }
        } catch (e) {
            console.error(`[PlayerStatsHandler]   ERROR querying Playerstats:`, e);
        }


        // --- 2. Query Verified Levels (Using determined actualPlayerName) ---
        const verifiedWhere = { verifier: actualPlayerName };
        console.log(`[PlayerStatsHandler] 2. Querying Verified Levels with WHERE:`, JSON.stringify(verifiedWhere));
        try {
            verifiedLevels = await prisma.level.findMany({
                where: verifiedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true }, // Include verifier for confirmation
                // orderBy: { placement: 'asc' } // Keep order if needed
            });
            console.log(`[PlayerStatsHandler]   SUCCESS: Found ${verifiedLevels.length} verified levels.`);
            if (verifiedLevels.length > 0) console.log(`[PlayerStatsHandler]   Verified level names: ${verifiedLevels.map(l=>l.name).join(', ')}`);
             if (decodedPlayerName.toLowerCase() === 'zoink') {
                 console.log(`[PlayerStatsHandler]   Raw verified levels result for ${actualPlayerName}:`, JSON.stringify(verifiedLevels.slice(0, 5), null, 2));
             }

        } catch(e) {
            console.error(`[PlayerStatsHandler]   ERROR querying verified levels:`, e);
        }

        // --- 3. Query Completed Levels (Using actualPlayerName) ---
         const completedWhere = { records: { some: { username: actualPlayerName, percent: 100 }}};
         console.log(`[PlayerStatsHandler] 3. Querying Completed Levels with WHERE:`, JSON.stringify(completedWhere));
        try {
            completedLevels = await prisma.level.findMany({
                where: completedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, records: { select: {username:true, percent: true}}}, // Include records for confirmation
                // orderBy: { placement: 'asc' } // Keep order if needed
            });
            console.log(`[PlayerStatsHandler]   SUCCESS: Found ${completedLevels.length} completed levels.`);
             if (completedLevels.length > 0) console.log(`[PlayerStatsHandler]   Completed level names: ${completedLevels.map(l=>l.name).join(', ')}`);
              if (decodedPlayerName.toLowerCase() === 'zoink') {
                 console.log(`[PlayerStatsHandler]   Raw completed levels result for ${actualPlayerName}:`, JSON.stringify(completedLevels.slice(0, 5), null, 2));
             }
        } catch (e) {
            console.error(`[PlayerStatsHandler]   ERROR querying completed levels:`, e);
        }


        // --- 4. Final Check if ANY data was found ---
         if (!playerStatsData && verifiedLevels.length === 0 && completedLevels.length === 0) {
             console.log(`[PlayerStatsHandler] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
             // Optionally check User model here if needed before 404ing
             // const userCheck = await prisma.user.findFirst({ where: { username: { equals: decodedPlayerName, mode: 'insensitive' }}});
             // if (!userCheck) { return res.status(404).json(/*...*/); }
              return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
         }

        // --- 5. Calculate Hardest Demon ---
        let hardestDemonForResponse = null;
        let hardestPlacement = Infinity;
        const combinedLevels = new Map();
        [...completedLevels, ...verifiedLevels].forEach(level => {
            if (level.list === 'main-list' && !combinedLevels.has(level.id)) { combinedLevels.set(level.id, level); }
        });
        combinedLevels.forEach(level => {
             if (typeof level.placement === 'number' && level.placement < hardestPlacement) {
                hardestPlacement = level.placement;
                hardestDemonForResponse = level;
             }
        });
        console.log(`[PlayerStatsHandler] Calculated hardest demon: ${hardestDemonForResponse?.name || 'None'}`);

        // --- 6. Construct Response ---
        const responseData = {
            // Synthesize playerStat if main list entry wasn't found but other data exists
            playerStat: playerStatsData || {
                name: actualPlayerName, demonlistScore: 0, demonlistRank: null,
                hardestDemonName: hardestDemonForResponse?.name ?? null,
                hardestDemonPlacement: hardestDemonForResponse?.placement ?? null,
                clan: null, list: 'main-list', updatedAt: null,
            },
            // user: null, // Removed user query result
            verifiedLevels: verifiedLevels,
            completedLevels: completedLevels,
        };
        // Ensure synthesized stats reflect calculation
        responseData.playerStat.hardestDemonName = hardestDemonForResponse?.name ?? null;
        responseData.playerStat.hardestDemonPlacement = hardestDemonForResponse?.placement ?? null;

        console.log(`[PlayerStatsHandler] Sending successful response for ${actualPlayerName}.`);
        return res.status(200).json(responseData);

    } catch (error) { // Catch unexpected errors
        console.error(`[PlayerStatsHandler] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}


// --- Helper Functions REMOVED ---
// loadStaticLists and findLevelDetailsByName are now imported