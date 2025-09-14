// gd-update.js
// A script to fetch Geometry Dash level data and update a JSON file.
// This version uses the gd.js library for a more robust and reliable process.

// To run this script, you must first install the gd.js package:
// npm install gd.js

import fs from 'fs/promises';
import path from 'path';
import gd from 'gd.js';

const gdClient = new gd();

/**
 * Searches for a level ID by its name.
 * @param {string} name The name of the level.
 * @returns {Promise<string|null>} The level ID or null if not found.
 */
async function fetchLevelIdByName(name) {
    console.log(`Searching for level ID for '${name}'...`);
    try {
        const searchResults = await gdClient.levels.search({ query: name });

        // The search() method can return an array or an object with a 'results' property.
        const levels = Array.isArray(searchResults) ? searchResults : searchResults.results;

        if (!levels || levels.length === 0) {
            console.warn(`No search results found for '${name}'.`);
            return null;
        }

        // Return the ID of the first level found.
        const foundLevel = levels[0];
        console.log(`Found level ID ${foundLevel.id} for '${name}'.`);
        return foundLevel.id;
        
    } catch (error) {
        console.error(`Error searching for level '${name}':`, error.message);
        return null;
    } finally {
        // Add a delay to avoid hitting API rate limits.
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}


// This is the main function that handles the file processing.
async function processLevelList(inputFileName, outputFileName) {
    try {
        console.log(`Reading file: ${inputFileName}`);
        const fileData = await fs.readFile(path.join(process.cwd(), inputFileName), 'utf-8');
        const levels = JSON.parse(fileData);

        console.log('Successfully read file. Starting data lookup...');

        for (const level of levels) {
            console.log(`\nProcessing level: "${level.name}"`);

            // Only update the level ID if it's not already present.
            if (!level.LevelId) {
                const levelId = await fetchLevelIdByName(level.name);
                level.LevelId = levelId || level.LevelId;
            }
            
            if (level.LevelId) {
                console.log(`Level "${level.name}" updated successfully.`);
            } else {
                console.log(`Skipping level "${level.name}" due to missing LevelId.`);
            }
        }

        const updatedData = JSON.stringify(levels, null, 2);
        await fs.writeFile(path.join(process.cwd(), outputFileName), updatedData);
        console.log(`\nAll done! Updated data written to: ${outputFileName}`);

    } catch (error) {
        console.error('An unhandled error occurred:', error.message);
    }
}

// Set the file names and start the process.
const INPUT_FILE = 'platformer-list.json';
const OUTPUT_FILE = 'updated-platformer-list.json';

processLevelList(INPUT_FILE, OUTPUT_FILE);
