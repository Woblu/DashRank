// seed_platformer.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function seedPlatformer() {
  console.log('Reading pemon_top150.json...');
  
  let rawData;
  try {
    rawData = fs.readFileSync('pemon_top150.json', 'utf-8');
  } catch (e) {
    console.error("Could not find pemon_top150.json. Make sure you ran the scrape script first!");
    process.exit(1);
  }

  const platformerLevels = JSON.parse(rawData);
  console.log(`Found ${platformerLevels.length} levels to import.`);

  // Clear existing Platformer List to avoid duplicates
  console.log('Clearing old platformer-list levels...');
  await prisma.level.deleteMany({ where: { list: 'platformer-list' } });

  console.log('Seeding new levels...');

  for (const pLevel of platformerLevels) {
    // Map Pemon records to our Schema's Record type
    const mappedRecords = pLevel.records.map(rec => ({
      username: rec.player.name, // Flatten the player object to just the name
      percent: 100,              // Platformer records are completions
      videoId: rec.video_id || '', // Handle missing video IDs
      // New fields:
      time: rec.formatted_time,
      mobile: rec.mobile,
      timestamp: rec.timestamp_milliseconds
    }));

    // Flatten verifier object if it exists, otherwise use null
    const verifierName = pLevel.verifier ? pLevel.verifier.name : 'Unknown';

    await prisma.level.create({
      data: {
        name: pLevel.name,
        placement: pLevel.placement,
        creator: pLevel.creator,
        verifier: verifierName,
        videoId: '', // Pemon list doesn't always give a main verification video on the top object, leave blank or find one
        levelId: pLevel.id, // The GD Level ID
        list: 'platformer-list',
        description: `Points: ${pLevel.points}`, // Storing points in description for now
        records: mappedRecords
      }
    });
    
    process.stdout.write(`\rImported #${pLevel.placement}: ${pLevel.name}    `);
  }

  console.log('\n\n✅ Platformer List seeding complete!');
}

seedPlatformer()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });