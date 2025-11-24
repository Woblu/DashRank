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

  console.log('Clearing old platformer-list levels...');
  await prisma.level.deleteMany({ where: { list: 'platformer-list' } });

  console.log('Seeding new levels...');

  for (const pLevel of platformerLevels) {
    // Map records
    const mappedRecords = pLevel.records.map(rec => ({
      username: rec.player.name,
      percent: 100,
      videoId: rec.video_id || '',
      time: rec.formatted_time,
      mobile: rec.mobile,
      timestamp: rec.timestamp_milliseconds
    }));

    const verifierName = pLevel.verifier ? pLevel.verifier.name : 'Unknown';
    
    // [FIX] Use the root video_id we just scraped
    const mainVideoId = pLevel.video_id || '';

    await prisma.level.create({
      data: {
        name: pLevel.name,
        placement: pLevel.placement,
        creator: pLevel.creator,
        verifier: verifierName,
        videoId: mainVideoId,       // [FIX] Now uses the correct field
        levelId: pLevel.id,
        list: 'platformer-list',
        description: '',            // [FIX] Forced empty description
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