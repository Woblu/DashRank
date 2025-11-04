// src/server/statsGeneration.js
import prismaClientPkg from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// [FIX] Import the new helper to load lists
import { loadAllStaticLists } from './utils/listHelpers.js';
// Import our utilities
import { calculateScore, cleanUsername } from '../utils/scoring.js';

const { PrismaClient } = prismaClientPkg;
const prisma = new PrismaClient();

// Helper to get paths correct
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const playerStatsDir = path.join(dataDir, 'playerstats');

/**
 * Gets or creates a blank player profile from the map.
 * @param {Map} map - The player profiles map.
 * @param {string} name - The clean, lowercase player name.
 * @param {string} originalName - The name with original casing.
 * @returns {object} The player's profile object.
 */
function getProfile(map, name, originalName) {
  if (!map.has(name)) {
    map.set(name, {
      name: originalName, // Store the first-seen cased name
      clan: null,
      score: 0,
      rank: 0,
      hardest: { placement: Infinity, name: null, id: null, levelId: null },
      verified: [],
      completed: [],
    });
  }
  // Update casing if a non-tagged name is found
  if (!map.get(name).name.includes('[')) {
      map.get(name).name = originalName;
  }
  return map.get(name);
}

/**
 * Extracts clan tag and updates profile.
 * @param {object} profile - The player's profile object.
 * @param {string} rawUsername - The username with potential tag (e.g., "[67] Zoink").
 */
function updateClan(profile, rawUsername) {
    if (profile.clan) return; // Already set
    const match = rawUsername.match(/\[(.*?)\]/);
    if (match && match[1]) {
        profile.clan = match[1];
        profile.name = rawUsername.replace(/\[.*?\]\s*/, ""); // Store clean name
    }
}

/**
 * Processes a single list and updates the database and static files.
 * @param {object} listConfig - Configuration object for the list.
 * @param {string} listConfig.listName - The name of the list (e.g., 'main').
 * @param {Array} listConfig.listData - The imported JSON data for the list.
 * @param {string} listConfig.statsViewerFile - The output filename (e.g., 'main-statsviewer.json').
 */
async function generateStatsForList({ listName, listData, statsViewerFile }) {
  console.log(`\n--- Starting stats generation for: ${listName} ---`);
  const playerProfiles = new Map();

  // --- 1. Iterate all levels and aggregate player data ---
  console.log(`Processing ${listData.length} levels from ${listName}-list.json...`);

  for (const level of listData) {
    // Score is only awarded for levels 1-150 that have a placement
    const levelScore = (level.placement && level.placement > 0 && level.placement <= 150) 
      ? calculateScore(level.placement) 
      : 0;
    
    // --- Process Verifier ---
    if (level.verifier) {
        const cleanVerifierName = cleanUsername(level.verifier);
        const profile = getProfile(playerProfiles, cleanVerifierName, level.verifier);
        updateClan(profile, level.verifier);

        if (levelScore > 0) profile.score += levelScore;
        profile.verified.push(level.name);

        if (level.placement && level.placement < profile.hardest.placement) {
            profile.hardest = { placement: level.placement, name: level.name, id: level.id, levelId: level.levelId };
        }
    }

    // --- Process Records ---
    if (level.records) {
      const verifierName = cleanUsername(level.verifier);
      for (const record of level.records) {
        if (record.percent === 100) {
          const cleanRecordName = cleanUsername(record.username);
          
          if (cleanRecordName === verifierName) continue; 

          const profile = getProfile(playerProfiles, cleanRecordName, record.username);
          updateClan(profile, record.username);

          if (!profile.completed.includes(level.name)) {
              if (levelScore > 0) profile.score += levelScore;
              profile.completed.push(level.name);

              if (level.placement && level.placement < profile.hardest.placement) {
                  profile.hardest = { placement: level.placement, name: level.name, id: level.id, levelId: level.levelId };
              }
          }
        }
      }
    }
  }
  console.log(`Found ${playerProfiles.size} unique players for ${listName}.`);

  // --- 2. Sort, Rank, and Format Data ---
  const allPlayers = Array.from(playerProfiles.values())
    .filter(p => p.score > 0) // Only rank players with score
    .sort((a, b) => b.score - a.score)
    .map((player, index) => {
      player.rank = index + 1;
      return player;
    });

  // --- 3. Write Static JSON Files ---

  // A. Write [list]-statsviewer.json (for the leaderboard)
  const leaderboardData = allPlayers.map(p => ({
    demonlistRank: p.rank,
    name: p.name,
    demonlistScore: p.score
  }));
  
  const leaderboardPath = path.join(dataDir, statsViewerFile);
  await fs.writeFile(leaderboardPath, JSON.stringify(leaderboardData, null, 2));
  console.log(`Successfully wrote ${leaderboardPath}`);

  // B. Write individual [player]-stats.json files ONLY for the main list
  if (listName === 'main') {
    console.log(`Writing ${allPlayers.length} individual player stat files for 'main' list...`);
    await fs.rm(playerStatsDir, { recursive: true, force: true }); // Clear old files
    await fs.mkdir(playerStatsDir, { recursive: true });

    for (const player of allPlayers) {
      const playerStatFile = {
        name: player.name,
        demonlistRank: player.rank,
        demonlistScore: player.score,
        demonlistStats: {
          main: player.completed.length + player.verified.length,
          extended: 0, // You can enhance this later
          legacy: 0
        },
        hardestDemon: player.hardest.name,
        demonsCompleted: [...player.verified, ...player.completed].sort(), // Combine and sort
        demonsVerified: player.verified.sort(),
        records: []
      };

      const fileName = `${player.name.toLowerCase().replace(/\s/g, '-')}-stats.json`;
      const filePath = path.join(playerStatsDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(playerStatFile, null, 2));
    }
    console.log(`Finished writing individual player files to ${playerStatsDir}`);
  }


  // --- 4. Update Prisma Database ---
  console.log(`Updating Prisma database for ${listName}...`);
  
  const prismaData = allPlayers.map(p => ({
    name: p.name,
    clan: p.clan,
    demonlistRank: p.rank,
    demonlistScore: p.score,
    hardestDemonName: p.hardest.name,
    hardestDemonPlacement: p.hardest.placement,
    list: listName, // Use the parameterized list name
  }));

  try {
    await prisma.$transaction(async (tx) => {
      // Nuke the old stats for this specific list
      await tx.playerstats.deleteMany({
        where: { list: listName }
      });
      
      // Create the new stats for this list
      if (prismaData.length > 0) {
        await tx.playerstats.createMany({
          data: prismaData
        });
        console.log(`Successfully inserted ${prismaData.length} player stats into database for ${listName}.`);
      } else {
        console.log(`No players with score > 0 for ${listName}. Database not updated.`);
      }
    });
  } catch (e) {
    console.error(`Failed to update database for ${listName}:`, e);
  }

  console.log(`--- Finished processing ${listName} ---`);
}

/**
 * Main function to run stats generation for all lists.
 */
async function generateAllStats() {
  console.log('===== STARTING FULL STATS GENERATION =====');
  
  // [FIX] Load lists from the helper function
  const {
    mainList,
    unratedList,
    platformerList,
    challengeList,
    speedhackList
  } = loadAllStaticLists();

  const listJobs = [
    { listName: 'main', listData: mainList, statsViewerFile: 'main-statsviewer.json' },
    { listName: 'unrated', listData: unratedList, statsViewerFile: 'unrated-statsviewer.json' },
    { listName: 'platformer', listData: platformerList, statsViewerFile: 'platformer-statsviewer.json' },
    { listName: 'challenge', listData: challengeList, statsViewerFile: 'challenge-statsviewer.json' },
    { listName: 'speedhack', listData: speedhackList, statsViewerFile: 'speedhack-statsviewer.json' }
  ];

  for (const job of listJobs) {
    await generateStatsForList(job);
  }

  console.log('\n===== FULL STATS GENERATION COMPLETE =====');
}

// --- Run the script ---
generateAllStats()
  .catch((e) => {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });