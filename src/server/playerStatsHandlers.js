// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
// Destructure PrismaClient and the correct enum name for your record status
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg;
import fs from 'fs';
import path from 'path';
// Import helpers (assuming path is correct: src/server/utils/listHelpers.js)
import { loadStaticLists, findLevelDetailsByName } from './utils/listHelpers.js';

const prisma = new PrismaClient();

// Main handler function
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    console.log(`[PlayerStatsHandler v6] ========= START Request for: ${decodedPlayerName} =========`);

    let playerStatsData = null;
    let verifiedLevels = [];
    let completedLevels = [];
    let actualPlayerName = decodedPlayerName; // Default name for queries

    try {
        // --- 1. Attempt Case-Insensitive Playerstats Query ---
        // ** FIX: Use 'main' instead of 'main-list' for the list filter **
        const playerStatsWhere = {
            name: { equals: decodedPlayerName, mode: 'insensitive' },
            list: 'main' // Corrected list value
        };
        console.log(`[PlayerStatsHandler v6] 1. Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));
        try {
            playerStatsData = await prisma.playerstats.findFirst({
                where: playerStatsWhere,
                select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
            });
            if (playerStatsData) {
                actualPlayerName = playerStatsData.name; // Use exact casing from DB
                console.log(`[PlayerStatsHandler v6]   SUCCESS: Found Playerstats. Actual name: ${actualPlayerName}. Data:`, playerStatsData);
            } else {
                console.log(`[PlayerStatsHandler v6]   INFO: No Playerstats entry found (case-insensitive for list 'main').`);
                // Explicit "Zoink" check can remain if needed for debugging specific case issues
                if (decodedPlayerName.toLowerCase() === 'zoink') {
                    console.log(`[PlayerStatsHandler v6]   Retrying Playerstats query with EXACT name "Zoink" and list 'main'`);
                    const exactMatchStats = await prisma.playerstats.findFirst({
                        where: { name: "Zoink", list: 'main'}, // Exact case "Zoink", corrected list
                        select: { name: true, id: true }
                    });
                    if (exactMatchStats) {
                        console.log(`[PlayerStatsHandler v6]   SUCCESS (Exact Match): Found Playerstats for "Zoink".`);
                        actualPlayerName = "Zoink"; // Force correct case
                        // Re-fetch full data with correct case
                        playerStatsData = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main' }, select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true } });
                    } else {
                        console.log(`[PlayerStatsHandler v6]   INFO (Exact Match): Still no Playerstats found for "Zoink" with list 'main'.`);
                    }
                }
            }
        } catch (e) {
            console.error(`[PlayerStatsHandler v6]   ERROR querying Playerstats:`, e);
        }

        // --- 2. Query Verified Levels (Using determined actualPlayerName) ---
        const verifiedWhere = { verifier: actualPlayerName }; // Query across all lists initially
        console.log(`[PlayerStatsHandler v6] 2. Querying Levels verified by WHERE:`, JSON.stringify(verifiedWhere));
        try {
            verifiedLevels = await prisma.level.findMany({
                where: verifiedWhere, // Find all levels verified by the player
                select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true },
                orderBy: { list: 'asc', placement: 'asc' } // Order by list then placement
            });
             // Filter out future list after fetching, if needed, or adjust query `list: { not: 'future-list' }`
             verifiedLevels = verifiedLevels.filter(l => l.list !== 'future-list');
            console.log(`[PlayerStatsHandler v6]   SUCCESS: Found ${verifiedLevels.length} verified levels (excluding future).`);
        } catch(e) {
            console.error(`[PlayerStatsHandler v6]   ERROR querying verified levels:`, e);
        }

        // --- 3. Query Completed Levels (Using actualPlayerName) ---
         const completedWhere = { records: { some: { username: actualPlayerName, percent: 100 }}};
         console.log(`[PlayerStatsHandler v6] 3. Querying Completed Levels with WHERE:`, JSON.stringify(completedWhere));
        try {
            completedLevels = await prisma.level.findMany({
                where: completedWhere, // Find all levels with a 100% record by the player
                select: { id: true, name: true, placement: true, list: true, levelId: true },
                orderBy: { list: 'asc', placement: 'asc' } // Order by list then placement
            });
            console.log(`[PlayerStatsHandler v6]   SUCCESS: Found ${completedLevels.length} completed levels.`);
        } catch (e) {
            console.error(`[PlayerStatsHandler v6]   ERROR querying completed levels:`, e);
        }

        // --- 4. Final Check if ANY data was found ---
         // If we didn't find a playerstats entry for 'main', but found completions/verifications, we can still proceed.
         if (!playerStatsData && verifiedLevels.length === 0 && completedLevels.length === 0) {
             console.log(`[PlayerStatsHandler v6] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
             return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
         }

        // --- 5. Calculate Hardest Demon ---
        let hardestDemonForResponse = null;
        let hardestPlacement = Infinity;
        const combinedLevels = new Map(); // Use Map to handle potential duplicates easily
        // Prioritize completed levels for hardest, then verified
        [...completedLevels, ...verifiedLevels].forEach(level => {
            // Only consider main list levels for hardest calculation
            if (level.list === 'main-list' && !combinedLevels.has(level.id)) {
                 combinedLevels.set(level.id, level);
            }
        });

        combinedLevels.forEach(level => {
             if (typeof level.placement === 'number' && level.placement < hardestPlacement) {
                hardestPlacement = level.placement;
                hardestDemonForResponse = level;
             }
        });
        console.log(`[PlayerStatsHandler v6] Calculated hardest demon: ${hardestDemonForResponse?.name || 'None'}`);

        // --- 6. Construct Response ---
        const responseData = {
            // Synthesize playerStat if main list entry wasn't found in DB
            playerStat: playerStatsData || {
                name: actualPlayerName, // Use the name confirmed/used in queries
                demonlistScore: 0, // Score/Rank likely missing if no DB entry found
                demonlistRank: null,
                hardestDemonName: hardestDemonForResponse?.name ?? null, // Use calculated hardest
                hardestDemonPlacement: hardestDemonForResponse?.placement ?? null, // Use calculated hardest
                clan: null,
                list: 'main', // Reflect the list context
                updatedAt: null,
            },
            verifiedLevels: verifiedLevels,
            completedLevels: completedLevels,
        };
        // Ensure playerStat reflects calculation even if synthesized
        responseData.playerStat.hardestDemonName = hardestDemonForResponse?.name ?? null;
        responseData.playerStat.hardestDemonPlacement = hardestDemonForResponse?.placement ?? null;

        console.log(`[PlayerStatsHandler v6] Sending successful response for ${actualPlayerName}.`);
        return res.status(200).json(responseData);

    } catch (error) { // Catch unexpected errors
        console.error(`[PlayerStatsHandler v6] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}


// --- Helper Functions (Imported via listHelpers.js) ---
// function loadStaticLists() { ... }
// const findLevelDetailsByName = (levelName) => { ... };