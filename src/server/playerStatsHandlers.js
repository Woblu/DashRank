// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// Destructure PrismaClient and the correct enum name for your record status
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg; // Adjust enum name if needed

// [FIX] Import helpers from the central utils file
import { loadStaticLists, findLevelDetailsByName } from './utils/listHelpers.js'; // Adjust path if needed

const prisma = new PrismaClient();

// Main handler function
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    console.log(`[PlayerStatsHandler v9] ========= START Request for: ${decodedPlayerName} =========`);

    let playerStatsData = null;
    let verifiedLevels = [];
    let completedLevels = [];
    let actualPlayerName = decodedPlayerName;

    try {
        // --- 1. Fetch Playerstats (Case-Insensitive, list: 'main') ---
        const playerStatsWhere = { name: { equals: decodedPlayerName, mode: 'insensitive' }, list: 'main' };
        console.log(`[PlayerStatsHandler v9] 1. Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));
        try {
            playerStatsData = await prisma.playerstats.findFirst({
                where: playerStatsWhere,
                select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
            });
            if (playerStatsData) {
                actualPlayerName = playerStatsData.name;
                console.log(`[PlayerStatsHandler v9]   SUCCESS: Found Playerstats. Actual name: ${actualPlayerName}. Hardest in DB: ${playerStatsData.hardestDemonName}`);
            } else {
                console.log(`[PlayerStatsHandler v9]   INFO: No Playerstats entry found.`);
                 // Explicit "Zoink" check
                if (decodedPlayerName.toLowerCase() === 'zoink') {
                    console.log(`[PlayerStatsHandler v9]   Retrying Playerstats query with EXACT name "Zoink" and list 'main'`);
                    const exactMatchStats = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main'}, select: { name: true, id: true } });
                    if (exactMatchStats) {
                         console.log(`[PlayerStatsHandler v9]   SUCCESS (Exact Match): Found Playerstats for "Zoink".`);
                         actualPlayerName = "Zoink";
                         playerStatsData = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main' }, select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true } });
                    } else { console.log(`[PlayerStatsHandler v9]   INFO (Exact Match): Still no Playerstats found for "Zoink" with list 'main'.`); }
                }
            }
        } catch (e) { console.error(`[PlayerStatsHandler v9]   ERROR querying Playerstats:`, e); }

        // --- 2. Query Verified Levels (Using actualPlayerName) ---
        const verifiedWhere = { verifier: actualPlayerName };
        console.log(`[PlayerStatsHandler v9] 2. Querying Verified Levels with WHERE:`, JSON.stringify(verifiedWhere));
        try {
            verifiedLevels = await prisma.level.findMany({
                where: verifiedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true },
                orderBy: [ { list: 'asc' }, { placement: 'asc' } ] // Correct orderBy
            });
             verifiedLevels = verifiedLevels.filter(l => l.list !== 'future-list');
            console.log(`[PlayerStatsHandler v9]   SUCCESS: Found ${verifiedLevels.length} verified levels (excluding future).`);
        } catch(e) { console.error(`[PlayerStatsHandler v9]   ERROR querying verified levels:`, e); }

        // --- 3. Query Completed Levels (Using actualPlayerName) ---
         const completedWhere = { records: { some: { username: actualPlayerName, percent: 100 }}};
         console.log(`[PlayerStatsHandler v9] 3. Querying Completed Levels with WHERE:`, JSON.stringify(completedWhere));
        try {
            completedLevels = await prisma.level.findMany({
                where: completedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true },
                orderBy: [ { list: 'asc' }, { placement: 'asc' } ] // Correct orderBy
            });
            console.log(`[PlayerStatsHandler v9]   SUCCESS: Found ${completedLevels.length} completed levels.`);
        } catch (e) { console.error(`[PlayerStatsHandler v9]   ERROR querying completed levels:`, e); }


        // --- 4. Final Check & Response ---
         if (!playerStatsData && verifiedLevels.length === 0 && completedLevels.length === 0) {
             console.log(`[PlayerStatsHandler v9] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
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
        console.log(`[PlayerStatsHandler v9] Calculated hardest demon: ${hardestDemonForResponse?.name || 'None'}`);

        // --- 6. Construct Response ---
        const responseData = {
            playerStat: playerStatsData || { // Synthesize base info
                name: actualPlayerName, demonlistScore: 0, demonlistRank: null,
                hardestDemonName: hardestDemonForResponse?.name ?? null,
                hardestDemonPlacement: hardestDemonForResponse?.placement ?? null,
                clan: null, list: 'main', updatedAt: null,
            },
            verifiedLevels: verifiedLevels,
            completedLevels: completedLevels,
        };
        // Ensure synthesized stats reflect calculation
        responseData.playerStat.hardestDemonName = hardestDemonForResponse?.name ?? null;
        responseData.playerStat.hardestDemonPlacement = hardestDemonForResponse?.placement ?? null;

        console.log(`[PlayerStatsHandler v9] Sending successful response for ${actualPlayerName}.`);
        return res.status(200).json(responseData);

    } catch (error) { // Catch unexpected errors
        console.error(`[PlayerStatsHandler v9] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}

// --- Helper Functions REMOVED ---
// loadStaticLists and findLevelDetailsByName are now imported from './utils/listHelpers.js'