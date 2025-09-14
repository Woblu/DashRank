const fs = require('fs');
const path = require('path');
const mainStats = require('./src/data/main-statsviewer.json');

const outputDir = path.join(__dirname, 'src', 'data', 'playerstats');

// Ensure the directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

mainStats.forEach(player => {
  const fileName = `${player.name.toLowerCase().replace(/\s/g, '-')}-stats.json`;
  const filePath = path.join(outputDir, fileName);
  
  const playerData = {
    "name": player.name,
    "demonsCompleted": [],
    "demonsVerified": [],
    "records": []
  };

  fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2), 'utf8');
  console.log(`Created file: ${filePath}`);
});

console.log('Player stats JSON files generated successfully.');