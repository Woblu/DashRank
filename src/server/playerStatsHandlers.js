// src/server/playerStatsHandlers.js
import { PrismaClient, RecordStatus } from '@prisma/client'; // Assuming RecordStatus is used for PersonalRecord

const prisma = new PrismaClient();

// Helper to find level details in static lists by name (case-insensitive)
// **Important:** This helper assumes static list files are accessible on the server.
// If not, this lookup logic needs to be adapted or removed.
// We might need to import these lists directly here if they aren't globally available.
// For now, assuming they can be imported or accessed.
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
import futureList from '../data/future-list.json';

const allLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };

const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allLists)) {
        const level = allLists[listType].find(l => l.name?.toLowerCase() === levelName.toLowerCase());
        if (level) {
            return { ...level, listType, levelName: level.name };
        }
    }
    console.warn(`[PlayerStatsHandler] Static level details not found for name: "${levelName}"`);
    return null;
};


// The actual handler function to be called by api/index.js
export async function getPlayerStats(req, res) {
  // Get player name from the request parameters (will be set by the router in index.js)
  const { playerName } = req.params; // Assuming router adds params to req

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ message: 'Player name parameter is required.' });
  }

  const decodedPlayerName = decodeURIComponent(playerName);
  console.log(`[PlayerStatsHandler] Fetching stats for: ${decodedPlayerName}`);

  try {
    // 1. Find User and associated PlayerStat
    const user = await prisma.user.findUnique({
      where: {
        username: decodedPlayerName,
      },
      select: {
        id: true,
        username: true,
        personalRecords: { // Fetch records needed for the 'beaten' list display
          where: {
            // Use your actual enum name here, e.g., 'COMPLETED'
            status: 'COMPLETED', // Adjust if enum name is PersonalRecordProgressStatus.COMPLETED
          },
          select: {
            levelId: true,
            levelName: true, // If stored on record
            // Include level relation if needed to get name/placement accurately
            // level: { select: { name: true, placement: true, list: true }}
          },
          // Consider ordering if needed
        },
        playerStat: { // Include the calculated stats
          select: {
            demonlistScore: true,
            demonlistRank: true,
            hardestDemonName: true,
            hardestDemonPlacement: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`[PlayerStatsHandler] User not found: ${decodedPlayerName}`);
      return res.status(404).json({ message: `Player "${decodedPlayerName}" not found.` });
    }

    // 2. Fetch levels verified by this user (if needed by frontend)
    const verifiedLevels = await prisma.level.findMany({
        where: {
            verifier: decodedPlayerName,
            list: { not: 'future-list' }
        },
        select: {
            id: true, name: true, placement: true, list: true, levelId: true,
        },
        orderBy: { placement: 'asc' }
    });

    console.log(`[PlayerStatsHandler] Found user: ${user.username}, Verified levels count: ${verifiedLevels.length}`);

    // 3. Construct the response object
    const responseData = {
      user: { // Send only necessary user info
        id: user.id,
        username: user.username,
        personalRecords: user.personalRecords, // Pass selected records
      },
      playerStat: user.playerStat, // Pass selected stats (can be null)
      verifiedLevels: verifiedLevels, // Pass verified levels
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[PlayerStatsHandler] Error fetching data for ${decodedPlayerName}:`, error);
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  } finally {
     // Prisma doesn't strictly need manual disconnect in serverless,
     // but it can be good practice if issues arise.
     // await prisma.$disconnect();
  }
}