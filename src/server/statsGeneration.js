// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client'; // Default import
const { PrismaClient, RecordStatus } = prismaClientPkg; // Destructure needed parts
import fs from 'fs'; // Import the 'fs' module
import path from 'path'; // Import the 'path' module

const prisma = new PrismaClient();

// --- Function to load static list data ---
let staticListsCache = null; // Cache the loaded data

function loadStaticLists() {
    // If cache exists, return it
    if (staticListsCache) {
        return staticListsCache;
    }
    console.log('[StatsGen] Loading static list JSON files...'); // Changed log prefix
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
        console.log('[StatsGen] Successfully loaded static lists.');
        return staticListsCache;
    } catch (error) {
        console.error('[StatsGen] CRITICAL ERROR: Failed to load static list JSON files:', error);
        return {};
    }
}
// --- End loading function ---


// Helper function to calculate points for a main list level
function calculatePoints(rank) {
  if (rank <= 0 || rank > 150) return 0;
  return 500 * Math.pow(0.9801, rank - 1);
}

// Function to regenerate stats and store in DB
export async function regeneratePlayerStats(targetUserIds = null) {
  console.log(`[StatsGen] Starting DB player stats regeneration... ${targetUserIds ? `Targeting ${targetUserIds.length} users.` : 'Targeting all users.'}`);
  try {
    // 1. Fetch all levels with current placements
    const allLevels = await prisma.level.findMany({
      select: { id: true, name: true, placement: true, list: true },
      orderBy: { placement: 'asc' }
    });
    const levelMap = new Map(allLevels.map(lvl => [lvl.id, lvl]));

    console.log('[StatsGen] Level Map Snippet:', Array.from(levelMap.values()).filter(l => l.list === 'main-list').slice(0, 5));

    // 2. Determine which users to process
    const userQuery = {
      where: {
        ...(targetUserIds && { id: { in: targetUserIds } }),
        personalRecords: { some: { status: 'COMPLETED' } }, // Use your enum name string here
      },
      include: {
        personalRecords: {
          where: { status: 'COMPLETED' }, // Use your enum name string here
          select: { levelId: true, percent: true },
        },
      },
    };

    const usersToUpdate = await prisma.user.findMany(userQuery);

    if (usersToUpdate.length === 0) {
      console.log('[StatsGen] No relevant users found to update.');
    } else {
      console.log(`[StatsGen] Calculating stats for ${usersToUpdate.length} users.`);
      const statsToUpsert = [];

      // 3. Calculate stats for each user
      for (const user of usersToUpdate) {
        let hardestDemon = { name: null, placement: Infinity };
        let totalScore = 0;

        for (const record of user.personalRecords) {
          const level = levelMap.get(record.levelId);
          // Ensure level exists and is on the main list for stats calculation
          if (!level || level.list !== 'main-list') continue;

          // Update hardest demon (use level placement directly)
          if (level.placement < hardestDemon.placement) {
             if (user.username.toLowerCase() === 'zoink') {
                console.log(`  [Zoink Debug] New Hardest: ${level.name} (#${level.placement}) replacing ${hardestDemon.name} (#${hardestDemon.placement})`);
             }
            hardestDemon = { name: level.name, placement: level.placement };
          }

          // Add score for 100% completions
          if (record.percent === 100) {
            totalScore += calculatePoints(level.placement);
          }
        }

         if (user.username.toLowerCase() === 'zoink') {
            console.log(`  [Zoink Debug] Final Hardest Calculated: ${hardestDemon.name} (#${hardestDemon.placement}) Score: ${totalScore.toFixed(2)}`);
         }

        // Prepare data for upsert
        statsToUpsert.push({
          userId: user.id,
          demonlistScore: totalScore,
          hardestDemonName: hardestDemon.placement === Infinity ? null : hardestDemon.name,
          hardestDemonPlacement: hardestDemon.placement === Infinity ? null : hardestDemon.placement,
        });
      }

      // 4. Upsert calculated stats (excluding rank)
      console.log(`[StatsGen] Upserting stats for ${statsToUpsert.length} users...`);
      // Use Promise.all for potentially faster upserts if many users
      await Promise.all(statsToUpsert.map(statData =>
        prisma.playerStat.upsert({
          where: { userId: statData.userId },
          update: {
            demonlistScore: statData.demonlistScore,
            hardestDemonName: statData.hardestDemonName,
            hardestDemonPlacement: statData.hardestDemonPlacement,
          },
          create: {
            userId: statData.userId,
            demonlistScore: statData.demonlistScore,
            hardestDemonName: statData.hardestDemonName,
            hardestDemonPlacement: statData.hardestDemonPlacement,
          },
        })
      ));
       console.log(`[StatsGen] Finished upserting base stats.`);
    }

    // --- Always Recalculate and Update Ranks ---
    console.log('[StatsGen] Recalculating all player ranks...');
    // 5. Fetch all player stats ordered by score
    const allPlayerStats = await prisma.playerStat.findMany({
      orderBy: [ { demonlistScore: 'desc' }, { updatedAt: 'asc' }, ],
      select: { id: true, userId: true, demonlistScore: true },
    });

    // 6. Update ranks in batches using Prisma $transaction
    const rankUpdates = [];
    let currentRank = 1;
    for (let i = 0; i < allPlayerStats.length; i++) {
        const stat = allPlayerStats[i];
        const rankToAssign = stat.demonlistScore > 0 ? currentRank++ : null;
        // Prepare the update operation; don't execute yet
        rankUpdates.push(
            prisma.playerStat.update({
                where: { id: stat.id },
                data: { demonlistRank: rankToAssign },
            })
        );
    }

    // Also prepare update for those with score <= 0
    rankUpdates.push(
        prisma.playerStat.updateMany({
            where: { demonlistScore: { lte: 0 } },
            data: { demonlistRank: null },
        })
    );

    console.log(`[StatsGen] Applying ${rankUpdates.length} rank updates in transaction...`);
    // Execute all updates atomically
    await prisma.$transaction(rankUpdates);
    console.log('[StatsGen] Finished updating ranks.');
    // --- End Rank Update ---

    console.log('[StatsGen] Player stats DB regeneration finished.');

  } catch (error) {
    console.error('[StatsGen] Error regenerating player stats in DB:', error);
    // throw error; // Re-throw if the calling function needs to handle failure
  }
}