import fs from 'fs';

const BASE_URL = 'https://pemonlist.com/api';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeTop150() {
    console.log("Starting Pemonlist Scrape (Top 150 Only)...");

    try {
        let skeletonList = [];
        let page = 1;

        console.log("\n--- Phase 1: Fetching List Index ---");

        while (skeletonList.length < 150) {
            const response = await fetch(`${BASE_URL}/list?limit=100&page=${page}`);
            if (!response.ok) throw new Error(`List fetch failed: ${response.statusText}`);
            const result = await response.json();

            if (result.data && result.data.length > 0) {
                skeletonList = skeletonList.concat(result.data);
                console.log(`Page ${page} retrieved. Total levels: ${skeletonList.length}`);
                page++;
                await delay(200); 
            } else {
                break;
            }
        }

        skeletonList.sort((a, b) => a.placement - b.placement);
        const top150 = skeletonList.slice(0, 150);

        console.log(`\nList trimmed to Top ${top150.length}. Now fetching details...`);
        console.log("\n--- Phase 2: Fetching Records & Details ---");
        
        const fullData = [];

        for (const basicLevel of top150) {
            const levelId = basicLevel.level_id;
            const levelName = basicLevel.name;
            
            if (!levelId) continue;

            try {
                const detailResponse = await fetch(`${BASE_URL}/level/${levelId}`);
                if (!detailResponse.ok) {
                    console.error(`Failed to fetch details for ${levelName}`);
                    continue;
                }
                const levelDetails = await detailResponse.json();

                if (levelDetails.error) {
                    console.error(`API Error for ${levelName}: ${levelDetails.error}`);
                    continue;
                }

                const completeLevelObject = {
                    id: levelDetails.level_id,
                    name: levelDetails.name,
                    placement: levelDetails.placement,
                    points: levelDetails.points,
                    creator: levelDetails.creator,
                    verifier: levelDetails.verifier,
                    records: levelDetails.records,
                    description: levelDetails.description || "",
                    video_id: levelDetails.video_id // [FIX] Capture the root video_id
                };

                fullData.push(completeLevelObject);
                console.log(`[#${levelDetails.placement}] ${levelName} - Saved`);

            } catch (err) {
                console.error(`Exception while scraping ${levelName}:`, err);
            }
            await delay(600); 
        }

        return fullData;

    } catch (error) {
        console.error("Critical Script Failure:", error);
        return null;
    }
}

scrapeTop150().then(data => {
    if (data) {
        fs.writeFileSync('pemon_top150.json', JSON.stringify(data, null, 2));
        console.log(`Success! Saved to pemon_top150.json`);
    }
});