// src/server/playerStatsHandlers.js
import {
  loadAllStaticLists,
  loadStatsViewer,
} from './utils/listHelpers.js';
import { cleanUsername } from '../utils/scoring.js';

// Load all list data ONCE when the server starts
const allLists = loadAllStaticLists();
const mainList = allLists.mainList;
const allPlayersStats = loadStatsViewer('main'); // Load the main leaderboard

// Create a Map for fast lookups by clean player name
const playerStatsMap = new Map();
allPlayersStats.forEach(player => {
    // Use the *cleaned* name as the key
    playerStatsMap.set(cleanUsername(player.name), player);
});
console.log(`[PlayerStatsHandler v12] Pre-loaded ${playerStatsMap.size} player stats from main-statsviewer.json`);

/**
 * Finds all completions and verifications for a player from static lists.
 * @param {string} cleanPlayerNameLower - The cleaned, lowercase player name.
 * @returns {object} - { verifiedLevels, completedLevels, hardestDemon }
 */
function getPlayerCompletions(cleanPlayerNameLower) {
  let verifiedLevels = [];
  let completedLevels = [];
  let hardestDemon = { placement: Infinity, name: null };
  const verifiedLevelNames = new Set(); // To prevent duplicates

  // --- 1. Find Verifications (from main list only) ---
  for (const level of mainList) {
    if (cleanUsername(level.verifier) === cleanPlayerNameLower) {
      const levelData = {
        id: level.id,
        name: level.name,
        placement: level.placement,
        list: 'main',
        levelId: level.levelId,
        verifier: level.verifier,
      };
      verifiedLevels.push(levelData);
      verifiedLevelNames.add(level.name.toLowerCase());

      // Check if this is the hardest demon
      if (level.placement < hardestDemon.placement) {
        hardestDemon = { placement: level.placement, name: level.name };
      }
    }
  }

  // --- 2. Find Completions (from main list only) ---
  for (const level of mainList) {
    if (level.records && Array.isArray(level.records)) {
      const isCompleted = level.records.some(
        record =>
          record.percent === 100 &&
          cleanUsername(record.username) === cleanPlayerNameLower
      );

      // Add if completed AND not already verified by this player
      if (isCompleted && !verifiedLevelNames.has(level.name.toLowerCase())) {
        completedLevels.push({
          id: level.id,
          name: level.name,
          placement: level.placement,
          list: 'main',
          levelId: level.levelId,
        });

        // Check if this is the hardest demon
        if (level.placement < hardestDemon.placement) {
          hardestDemon = { placement: level.placement, name: level.name };
        }
      }
    }
  }

  // Sort by placement
  verifiedLevels.sort((a, b) => a.placement - b.placement);
  completedLevels.sort((a, b) => a.placement - b.placement);
  
  return {
    verifiedLevels,
    completedLevels,
    hardestDemon: hardestDemon.placement === Infinity ? null : hardestDemon,
  };
}

/**
 * [REWRITTEN] Main handler function
 * This now reads from the static JSON files, bypassing the stale database.
 */
export async function getPlayerStats(req, res) {
  const { playerName } = req.params;
  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ message: 'Player name parameter is required.' });
  }

  // Clean the input name (e.g., "[67]-zoink" -> "zoink")
  const decodedPlayerName = decodeURIComponent(playerName);
  const cleanName = cleanUsername(decodedPlayerName.replace(/-/g, ' '));
  
  console.log(`[PlayerStatsHandler v12] ========= START Request for: ${decodedPlayerName} (Cleaned: ${cleanName}) =========`);

  try {
    // --- 1. Get Rank and Score from the stats viewer map ---
    const statsFromViewer = playerStatsMap.get(cleanName);

    // --- 2. Get Completions and Hardest Demon from static lists ---
    const { verifiedLevels, completedLevels, hardestDemon } =
      getPlayerCompletions(cleanName);

    // --- 3. Final Check & Response ---
    if (!statsFromViewer && verifiedLevels.length === 0 && completedLevels.length === 0) {
      console.log(`[PlayerStatsHandler v12] FINAL CHECK: No data found for ${cleanName}. Returning 404.`);
      return res.status(404).json({ message: `Player "${cleanName}" not found or has no associated data.` });
    }

    // --- 4. Construct Response ---
    let playerStat;
    if (statsFromViewer) {
      // Player is ranked, use data from stats viewer
      playerStat = {
        name: statsFromViewer.name, // Use the proper-cased name
        demonlistScore: statsFromViewer.demonlistScore,
        demonlistRank: statsFromViewer.demonlistRank,
        hardestDemonName: hardestDemon?.name ?? null,
        hardestDemonPlacement: hardestDemon?.placement ?? null,
        clan: null, // You can add this back if you parse it from statsFromViewer.name
        list: 'main',
        updatedAt: new Date().toISOString(), // Data is live
      };
    } else {
      // Player is not ranked but has completions
      playerStat = {
        name: decodedPlayerName, // Fallback to the requested name
        demonlistScore: 0,
        demonlistRank: null,
        hardestDemonName: hardestDemon?.name ?? null,
        hardestDemonPlacement: hardestDemon?.placement ?? null,
        clan: null,
        list: 'main',
        updatedAt: new Date().toISOString(),
      };
    }
    
    // [FIX] Ensure the *hardest demon calculation* is always used,
    // as the stats viewer might be stale if `generate-stats` hasn't run.
    // This provides the most accurate "hardest" placement.
    if (hardestDemon) {
        playerStat.hardestDemonName = hardestDemon.name;
        playerStat.hardestDemonPlacement = hardestDemon.placement;
    }

    const responseData = {
      playerStat,
      verifiedLevels,
      completedLevels,
    };

    console.log(`[PlayerStatsHandler v12] Sending successful response for ${cleanName}.`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[PlayerStatsHandler v12] UNEXPECTED GLOBAL error fetching data for ${cleanName}:`, error);
    return res.status(500).json({ message: 'Internal server error while fetching player stats.' });
  }
}