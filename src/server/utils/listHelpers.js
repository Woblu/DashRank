// src/server/utils/listHelpers.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads and parses a JSON file from the data directory.
 * @param {string} filename - The name of the JSON file (e.g., 'main-list.json').
 * @returns {object} The parsed JSON data.
 */
function loadJson(filename) {
  // Path from src/server/utils -> src/server -> src -> data
  const fullPath = path.join(__dirname, '..', '..', 'data', filename);
  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (e) {
    console.error(`Failed to load JSON file: ${filename}`, e);
    throw new Error(`Could not load list data for ${filename}.`);
  }
}

// Load all lists
const mainList = loadJson('main-list.json');
const unratedList = loadJson('unrated-list.json');
const platformerList = loadJson('platformer-list.json');
const challengeList = loadJson('challenge-list.json');
const speedhackList = loadJson('speedhack-list.json');

const allLists = {
  'main-list': mainList,
  'unrated-list': unratedList,
  'platformer-list': platformerList,
  'challenge-list': challengeList,
  'speedhack-list': speedhackList,
};

/**
 * Loads the static data for a specific list.
 * @param {string} listName - The name of the list (e.g., 'main-list').
 * @returns {Array} The array of level data.
 */
export function loadStaticList(listName) {
  return allLists[listName] || [];
}

/**
 * Loads all static lists.
 * @returns {object} An object containing all list data.
 */
export function loadAllStaticLists() {
    return {
        mainList,
        unratedList,
        platformerList,
        challengeList,
        speedhackList,
    };
}

/**
 * Finds a level's details by its name from all static lists.
 * @param {string} levelName - The name of the level to find.
 * @returns {object | null} The level object or null if not found.
 */
export function findLevelDetailsByName(levelName) {
    if (!levelName) return null;
    const nameLower = levelName.toLowerCase();
    for (const list of Object.values(allLists)) {
        const level = list.find(l => l.name?.toLowerCase() === nameLower);
        if (level) return level;
    }
    return null;
}