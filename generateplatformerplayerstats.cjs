const fs = require('fs');
const path = require('path');

// 1. Point to the platformer stats file
const platformerStats = require('./src/data/platformer-statsviewer.json');

// 2. MODIFIED: Set the new output directory
const outputDir = path.join(__dirname, 'src', 'data', 'platformerplayerstats');

// 3. Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 4. Iterate over the platformer players and create a file for each
platformerStats.forEach(player => {
  if (!player.name) {
    console.warn('Skipping a player with no name.');
    return;
  }
  
  const fileName = `${player.name.toLowerCase().replace(/\s/g, '-')}-stats.json`;
  const filePath = path.join(outputDir, fileName);

  // 5. Create the default JSON structure
  const playerData = {
    "name": player.name,
    "clan": player.clan || null,
    "demonsCompleted": [],
    "demonsVerified": [],
    "records": []
  };

  // 6. Write the new file, but only if it doesn't already exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2), 'utf8');
    console.log(`Created file: ${filePath}`);
  } else {
    console.log(`File already exists, skipping: ${filePath}`);
  }
});

console.log('Platformer player stats JSON files generated successfully.');