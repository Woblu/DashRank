// fetch-slice.js
import axios from 'axios';
import fs from 'fs';

// Helper function to extract the YouTube ID from various URL formats
const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+).*/; // Changed regex to be more robust
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // Fallback for cases where it's just a raw ID or a very simple /watch URL without v=
  if (urlOrId.includes('youtube.com/watch') && !urlOrId.includes('v=')) {
    return null; // Explicitly return null if it's just the base /watch URL
  }
  return urlOrId.split('?')[0].split('&')[0];
};

async function fetchAndFormat() {
  console.log('Fetching levels 76-150 from Pointercrate...');

  try {
    const response = await axios.get('https://pointercrate.com/api/v2/demons/listed/?limit=75&after=75');
    const pointercrateDemons = response.data;

    if (!pointercrateDemons || pointercrateDemons.length === 0) {
      console.log('No demons found in the specified range.');
      return;
    }

    console.log('\n--- RAW API RESPONSE (for debugging) ---');
    console.log(JSON.stringify(pointercrateDemons, null, 2)); // Log raw response
    console.log('--------------------------------------\n');


    const transformedLevels = pointercrateDemons.map(demon => ({
      placement: demon.position,
      name: demon.name,
      creator: demon.publisher.name,
      verifier: demon.verifier.name,
      levelId: demon.level_id,
      videoId: getYouTubeVideoId(demon.video),
      records: (demon.records || []).map(record => ({
        username: record.player.name,
        percent: record.progress,
        videoId: getYouTubeVideoId(record.video),
      })),
    }));

    console.log(`\n✅ Success! Copied ${transformedLevels.length} levels. Add this JSON array to your main-list.json file:\n`);
    console.log(JSON.stringify(transformedLevels, null, 2));

  } catch (error) {
    console.error('\n❌ Failed to fetch data from Pointercrate API:', error.message);
  }
}

fetchAndFormat();