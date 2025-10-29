// src/server/playerStatsHandlers.js
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg; // Only need PrismaClient

// No need for fs, path, or list helpers in this file anymore

const prisma = new PrismaClient();

// Main handler function - Simplified to ONLY fetch Playerstats
export async function getPlayerStats(req, res) {
    const { playerName } = req.params;
    if (!playerName || typeof playerName !== 'string') {
        return res.status(400).json({ message: 'Player name parameter is required.' });
    }

    const decodedPlayerName = decodeURIComponent(playerName);
    console.log(`[PlayerStatsHandler SIMPLE] ========= START Request for: ${decodedPlayerName} =========`);

    try {
        // --- 1. Query Playerstats (Case-Insensitive for main list) ---
        const playerStatsWhere = {
            name: { equals: decodedPlayerName, mode: 'insensitive' },
            list: 'main-list' // Assuming profile page primarily shows main list stats
        };
        console.log(`[PlayerStatsHandler SIMPLE] Querying Playerstats with WHERE:`, JSON.stringify(playerStatsWhere));

        const playerStatsData = await prisma.playerstats.findFirst({
            where: playerStatsWhere,
            // Select the fields needed by the profile header
            select: {
                id: true,
                demonlistScore: true,
                demonlistRank: true,
                hardestDemonName: true,
                hardestDemonPlacement: true,
                name: true, // Get actual casing
                clan: true,
                list: true,
                updatedAt: true,
            }
        });

        if (playerStatsData) {
            console.log(`[PlayerStatsHandler SIMPLE] SUCCESS: Found Playerstats data for ${playerStatsData.name}.`);
            // Return only the stats object. Frontend will handle completions/verifications.
            return res.status(200).json({ playerStat: playerStatsData });
        } else {
            console.log(`[PlayerStatsHandler SIMPLE] INFO: No Playerstats entry found for ${decodedPlayerName} on main list.`);
            // If no stats found, return 404. Frontend can decide if it still wants
            // to display completions/verifications based on static files.
            return res.status(404).json({ message: `Player "${decodedPlayerName}" has no stats on the main list.` });
        }

    } catch (error) { // Catch unexpected errors
        console.error(`[PlayerStatsHandler SIMPLE] UNEXPECTED GLOBAL error fetching data for ${decodedPlayerName}:`, error);
        return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
    }
}