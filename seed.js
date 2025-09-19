// seed.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting manual seed process from local JSON files...');

  const listsToSeed = [
    { name: 'main', filePath: './src/data/main-list.json' },
  ];

  for (const list of listsToSeed) {
    console.log(`Processing ${list.name} list...`);
    const fullPath = path.resolve(list.filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`SKIPPING: Data file not found at ${fullPath}`);
      continue;
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const levelsData = JSON.parse(fileContent);
    console.log(`Found ${levelsData.length} levels in ${list.name}-list.json.`);

    const transformedLevels = levelsData.map(level => {
      // Parse levelId to an integer. If it's not a valid number, default to null.
      const parsedLevelId = level.levelId ? parseInt(level.levelId, 10) : null;

      return {
        placement: level.placement,
        name: level.name,
        creator: level.creator,
        verifier: level.verifier,
        levelId: isNaN(parsedLevelId) ? null : parsedLevelId, // THIS IS THE FIX
        videoId: level.videoId,
        description: level.description,
        records: level.records || [],
        list: list.name,
      };
    });

    console.log(`Clearing old "${list.name}" list from the database...`);
    await prisma.level.deleteMany({
      where: {
        list: list.name,
      },
    });

    console.log(`Seeding new "${list.name}" list into the database...`);
    if (transformedLevels.length > 0) {
        await prisma.$transaction(
            transformedLevels.map(levelData => 
            prisma.level.create({ data: levelData })
            )
        );
    }
  }

  console.log('Manual seeding process completed successfully! ✅');
}

main()
  .catch((e) => {
    console.error('An error occurred during the seed process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });