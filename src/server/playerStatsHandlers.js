// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient, PersonalRecordProgressStatus } = prismaClientPkg; // Use your actual enum
import fs from 'fs';
import path from 'path';
// Import helpers (assuming path is correct: src/server/utils/listHelpers.js)
import { loadStaticLists, findLevelDetailsByName } from './utils/listHelpers.js';

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
    console.log(`[PlayerStatsHandler v7 DEBUG] ========= START Request for: ${decodedPlayerName} =========`);

    let playerStatsData = null;
    let verifiedLevels = [];
    let completedLevels = [];
    let actualPlayerName = decodedPlayerName;

    try {
        // --- 1. Fetch Playerstats (Case-Insensitive) ---
        const playerStatsWhere = {
            name: { equals: decodedPlayerName, mode: 'insensitive' },
            list: 'main' // Correct list value
        };
        console.log(`[PlayerStatsHandler v7 DEBUG] 1. Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));
        try {
            playerStatsData = await prisma.playerstats.findFirst({
                where: playerStatsWhere,
                select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true }
            });
            if (playerStatsData) {
                actualPlayerName = playerStatsData.name;
                console.log(`[PlayerStatsHandler v7 DEBUG]   SUCCESS: Found Playerstats. Actual name: ${actualPlayerName}.`);
            } else {
                console.log(`[PlayerStatsHandler v7 DEBUG]   INFO: No Playerstats entry found (case-insensitive for list 'main').`);
                 // Attempt exact match only if insensitive fails, useful for specific cases like 'Zoink'
                if (decodedPlayerName.toLowerCase() === 'zoink') {
                    console.log(`[PlayerStatsHandler v7 DEBUG]   Retrying Playerstats query with EXACT name "Zoink"`);
                    const exactMatchStats = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main'}, select: { name: true, id: true } });
                    if (exactMatchStats) {
                         console.log(`[PlayerStatsHandler v7 DEBUG]   SUCCESS (Exact Match): Found Playerstats for "Zoink".`);
                         actualPlayerName = "Zoink";
                         playerStatsData = await prisma.playerstats.findFirst({ where: { name: "Zoink", list: 'main' }, select: { id: true, demonlistScore: true, demonlistRank: true, hardestDemonName: true, hardestDemonPlacement: true, name: true, clan: true, list: true, updatedAt: true } });
                    } else { console.log(`[PlayerStatsHandler v7 DEBUG]   INFO (Exact Match): Still no Playerstats found for "Zoink" with list 'main'.`); }
                }
            }
        } catch (e) { console.error(`[PlayerStatsHandler v7 DEBUG]   ERROR querying Playerstats:`, e); }

        // --- 2. Query Verified Levels ---
        const verifiedWhere = { verifier: actualPlayerName };
        console.log(`[PlayerStatsHandler v7 DEBUG] 2. Querying Levels verified by WHERE:`, JSON.stringify(verifiedWhere));
        try {
            verifiedLevels = await prisma.level.findMany({
                where: verifiedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, verifier: true },
                // ** FIX: Correct orderBy syntax **
                orderBy: [
                    { list: 'asc' },
                    { placement: 'asc' }
                ]
            });
             // Filter out future list after fetching
             verifiedLevels = verifiedLevels.filter(l => l.list !== 'future-list');
            console.log(`[PlayerStatsHandler v7 DEBUG]   SUCCESS: Found ${verifiedLevels.length} verified levels (excluding future).`);
        } catch(e) { console.error(`[PlayerStatsHandler v7 DEBUG]   ERROR querying verified levels:`, e); }

        // --- 3. Query Completed Levels ---
        const completedWhere = { records: { some: { username: actualPlayerName, percent: 100 }}};
        console.log(`[PlayerStatsHandler v7 DEBUG] 3. Querying Completed Levels with WHERE:`, JSON.stringify(completedWhere));
        try {
            completedLevels = await prisma.level.findMany({
                where: completedWhere,
                select: { id: true, name: true, placement: true, list: true, levelId: true, records: { select: {username:true, percent: true}}},
                // ** FIX: Correct orderBy syntax **
                orderBy: [
                    { list: 'asc' },
                    { placement: 'asc' }
                ]
            });
            console.log(`[PlayerStatsHandler v7 DEBUG]   SUCCESS: Found ${completedLevels.length} completed levels.`);
        } catch (e) { console.error(`[PlayerStatsHandler v7 DEBUG]   ERROR querying completed levels:`, e); }

        // --- 4. Final Check & Response ---
        if (!playerStatsData && verifiedLevels.length === 0 && completedLevels.length === 0) {
            console.log(`[PlayerStatsHandler v7 DEBUG] FINAL CHECK: No data found for ${decodedPlayerName}. Returning 404.`);
            return res.status(404).json({ message: `Player "${decodedPlayerName}" not found or has no associated data.` });
        }

        // --- 5. Calculate Hardest Demon ---
        let hardestDemonForResponse = null;
        let hardestPlacement = Infinity;
        const combinedLevels = new Map();
        [...completedLevels, ...verifiedLevels].forEach(level => {
            if (level.list === 'main' && !combinedLevels.has(level.id)) { // Check against 'main'
                 combinedLevels.set(level.id, level);
             }
        });
        combinedLevels.forEach(level => {
             if (typeof level.placement === 'number' && level.placement < hardestPlacement) {
                hardestPlacement = level.placement;
                hardestDemonForResponse = level;
             }
        });
        console.log(`[PlayerStatsHandler v7 DEBUG] Calculated hardest demon: ${hardestDemonForResponse?.name || 'None'}`);

        // --- 6. Construct Response ---
        const responseData = {
            playerStat: playerStatsData || { /* Synthesize if needed */ },
            verifiedLevels: verifiedLevels,
            completedLevels: completedLevels,
        };
        // Ensure synthesized/fetched stats reflect calculation
        if (!responseData.playerStat) { // Create synthesized if null
             responseData.playerStat = {
                name: actualPlayerName, demonlistScore: 0, demonlistRank: null,
                clan: null, list: 'main', updatedAt: null,
             };
        }
        responseData.playerStat.hardestDemonName = hardestDemonForResponse?.name ?? null;
        responseData.playerStat.hardestDemonPlacement = hardestDemonForResponse?.placement ?? null;

        console.log(`[PlayerStatsHandler v7 DEBUG] Sending successful response for ${actualPlayerName}.`);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error(`[PlayerStatsHandler v7 DEBUG] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}

// --- Helper Functions (Imported via listHelpers.js) ---
// loadStaticLists and findLevelDetailsByName are assumed to be imported correctly
// function loadStaticLists() { ... }
// const findLevelDetailsByName = (levelName) => { ... };