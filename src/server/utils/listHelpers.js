// src/server/utils/listHelpers.js
import fs from 'fs';
import path from 'path';

// --- Static List Loading ---
let staticListsCache = null;

export function loadStaticLists() { // Export the function
    if (staticListsCache) {
        return staticListsCache;
    }
    console.log('[ListHelpers] Loading static list JSON files...');
    try {
        const dataDir = path.resolve(process.cwd(), 'src/data');
        const mainList = JSON.parse(fs.readFileSync(path.join(dataDir, 'main-list.json'), 'utf8'));
        const unratedList = JSON.parse(fs.readFileSync(path.join(dataDir, 'unrated-list.json'), 'utf8'));
        const platformerList = JSON.parse(fs.readFileSync(path.join(dataDir, 'platformer-list.json'), 'utf8'));
        const challengeList = JSON.parse(fs.readFileSync(path.join(dataDir, 'challenge-list.json'), 'utf8'));
        const futureList = JSON.parse(fs.readFileSync(path.join(dataDir, 'future-list.json'), 'utf8'));

        staticListsCache = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
        console.log('[ListHelpers] Successfully loaded static lists.');
        return staticListsCache;
    } catch (error) {
        console.error('[ListHelpers] CRITICAL ERROR: Failed to load static list JSON files:', error);
        return {}; // Return empty to avoid crash
    }
}

// Helper using loaded static lists
export const findLevelDetailsByName = (levelName) => { // Export the function
    const allLists = loadStaticLists(); // Uses the function above
    if (!levelName || levelName === 'N/A' || Object.keys(allLists).length === 0) return null;
    for (const listType of Object.keys(allLists)) {
        const listData = allLists[listType];
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) { return { ...level, listType, levelName: level.name }; }
        } else { console.warn(`[ListHelpers] Static list data for "${listType}" is not an array.`); }
    }
    return null;
};