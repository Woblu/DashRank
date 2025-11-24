import fs from 'fs';

const BASE_URL = 'https://pemonlist.com/api';

// Helper delay to prevent rate-limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeTop150() {
    console.log("Starting Pemonlist Scrape (Top 150 Only)...");

    try {
        // --- PHASE 1: Fetch the Skeleton List (First 150 Levels) ---
        let skeletonList = [];
        let page = 1;

        console.log("\n--- Phase 1: Fetching List Index ---");

        // We only need to loop until we have at least 150 levels.
        // Since max limit per page is usually restricted, we'll do chunks of 100.
        while (skeletonList.length < 150) {
            // Using limit=100 to get data efficiently
            const response = await fetch(`${BASE_URL}/list?limit=100&page=${page}`);
            
            if (!response.ok) {
                throw new Error(`List fetch failed on page ${page}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.data && result.data.length > 0) {
                skeletonList = skeletonList.concat(result.data);
                console.log(`Page ${page} retrieved. Total levels found so far: ${skeletonList.length}`);
                page++;
                await delay(200); 
            } else {
                // Stop if we run out of levels before hitting 150
                break;
            }
        }

        // Ensure we sort by placement to be 100% accurate
        skeletonList.sort((a, b) => a.placement - b.placement);

        // Cut the list to exactly the Top 150
        const top150 = skeletonList.slice(0, 150);

        console.log(`\nList trimmed to Top ${top150.length} levels.`);
        console.log("Now fetching full details...");
        
        // --- PHASE 2: Fetch Full Details for Top 150 ---
        console.log("\n--- Phase 2: Fetching Records & Details ---");
        
        const fullData = [];

        for (const basicLevel of top150) {
            const levelId = basicLevel.level_id;
            const levelName = basicLevel.name;
            const placement = basicLevel.placement;

            if (!levelId) continue;

            try {
                // Query the specific level endpoint for full records
                const detailResponse = await fetch(`${BASE_URL}/level/${levelId}`);
                
                if (!detailResponse.ok) {
                    console.error(`Failed to fetch details for ${levelName} (#${placement})`);
                    continue;
                }

                const levelDetails = await detailResponse.json();

                if (levelDetails.error) {
                    console.error(`API Error for ${levelName}: ${levelDetails.error}`);
                    continue;
                }

                // Construct the complete data object
                const completeLevelObject = {
                    id: levelDetails.level_id,
                    name: levelDetails.name,
                    placement: levelDetails.placement,
                    points: levelDetails.points,     //
                    creator: levelDetails.creator,
                    verifier: levelDetails.verifier, //
                    records: levelDetails.records    //
                };

                fullData.push(completeLevelObject);

                const recordCount = levelDetails.records ? levelDetails.records.length : 0;
                console.log(`[#${placement}] ${levelName} - Saved (${recordCount} records)`);

            } catch (err) {
                console.error(`Exception while scraping ${levelName}:`, err);
            }

            // 600ms delay to be safe
            await delay(600); 
        }

        return fullData;

    } catch (error) {
        console.error("Critical Script Failure:", error);
        return null;
    }
}

// --- Execute and Save ---
scrapeTop150().then(data => {
    if (data) {
        console.log("\n--- Scrape Complete ---");
        const fileName = 'pemon_top150.json';
        fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
        console.log(`Success! Data for ${data.length} levels saved to ${fileName}`);
    }
});