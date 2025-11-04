// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;
import { cleanUsername } from '../utils/scoring.js';
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

/**
 * [REWRITTEN] Main handler function
 * This now uses the hybrid model:
 * 1. Gets Rank/Score from DB (`playerstats`)
 * 2. Gets Completions/Verifications from Static JSONs
 * 3. Gets correct placements from DB (`level`)
 * 4. Calculates hardest demon and returns all data.
 */
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    const cleanName = cleanUsername(decodedPlayerName.replace(/-/g, ' '));
    
    console.log(`[PlayerStatsHandler v14] ========= START Request for: ${decodedPlayerName} (Cleaned: ${cleanName}) =========`);

    try {
        // --- 1. Get Core Rank/Score from DB ---
        // We find the player by their CLEAN name.
        const playerCoreStats = await prisma.playerstats.findFirst({
            where: {
                name: { equals: cleanName, mode: 'insensitive' },
                list: 'main'
            },
            select: { name: true, demonlistRank: true, demonlistScore: true, clan: true }
        });
        
        if (playerCoreStats) {
             console.log(`[PlayerStatsHandler v14] Found core stats in DB: Rank #${playerCoreStats.demonlistRank}`);
        } else {
             console.log(`[PlayerStatsHandler v14] No core stats found in DB for ${cleanName}.`);
        }
        
        // --- 2. Get Correct Placements from DB ---
        const dbLevels = await prisma.level.findMany({
            where: { placement: { not: null } },
            select: { name: true, placement: true, list: true, id: true, levelId: true }
        });
        
        // Create a map for fast lookup: "level name lower" -> { placement, id, levelId }
        const dbLevelMap = new Map();
        for (const level of dbLevels) {
            dbLevelMap.set(level.name.toLowerCase(), level);
        }
        console.log(`[PlayerStatsHandler v14] Loaded ${dbLevelMap.size} level placements from DB.`);

        // --- 3. Scan Static JSONs for Completions & Verifications ---
        const tempVerifiedByList = {};
        const tempBeatenByList = {};
        const verifiedLevelNames = new Set();
        let hardestDemon = { placement: Infinity, name: null, levelId: null, id: null, listType: null };

        console.log(`[PlayerStatsHandler v14] Scanning static JSONs for '${cleanName}'...`);
        
        for (const listType in allListsData) {
            const staticLevels = allListsData[listType];
            if (!Array.isArray(staticLevels)) continue;

            for (const level of staticLevels) {
                const levelNameLower = level.name.toLowerCase();
                
                // Get correct placement from DB
                const dbLevelInfo = dbLevelMap.get(levelNameLower);
                const currentPlacement = dbLevelInfo?.placement || level.placement; // Fallback to JSON placement
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
                    
                    // Check hardest (only for main list)
                    if (listType === 'main' && currentPlacement < hardestDemon.placement) {
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

                        // Check hardest (only for main list)
                        if (listType === 'main' && currentPlacement < hardestDemon.placement) {
                            hardestDemon = levelData;
                        }
                    }
                }
            }
        }
        
        // Sort all lists by placement
        Object.values(tempBeatenByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
        Object.values(tempVerifiedByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));

        console.log(`[PlayerStatsHandler v14] Found ${Object.keys(tempBeatenByList).length} completed lists.`);
        console.log(`[PlayerStatsHandler v14] Found ${Object.keys(tempVerifiedByList).length} verified lists.`);
        console.log(`[PlayerStatsHandler v14] Calculated hardest demon: ${hardestDemon.name || 'None'} (#${hardestDemon.placement || 'N/A'})`);

        // --- 4. Final Check ---
        if (!playerCoreStats && Object.keys(tempBeatenByList).length === 0 && Object.keys(tempVerifiedByList).length === 0) {
            console.log(`[PlayerStatsHandler v14] FINAL CHECK: No data found for ${cleanName}. Returning 404.`);
            return res.status(404).json({ message: `Player "${cleanName}" not found or has no associated data.` });
        }

        // --- 5. Construct Response ---
        const playerStat = {
            name: playerCoreStats?.name || decodedPlayerName, // Use proper cased name from DB if available
            demonlistScore: playerCoreStats?.demonlistScore || 0,
            demonlistRank: playerCoreStats?.demonlistRank || null,
            hardestDemonName: hardestDemon.name,
            hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
            clan: playerCoreStats?.clan || null,
            list: 'main',
            updatedAt: new Date().toISOString(),
        };

        const responseData = {
            playerStat,
            beatenByList: tempBeatenByList,
            verifiedByList: tempVerifiedByList,
            // [NEW] Send the calculated hardest demon object for display
            hardestDemonDisplay: hardestDemon.placement === Infinity ? null : hardestDemon
        };

        console.log(`[PlayerStatsHandler v14] Sending successful response for ${cleanName}.`);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error(`[PlayerStatsHandler v14] UNEXPECTED GLOBAL error fetching data for ${cleanName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}