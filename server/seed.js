import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Level from './models/Level.js';
import PlayerStat from './models/PlayerStat.js'; // 1. Import new model

// ... all your list imports ...
import mainList from '../src/data/main-list.json' with { type: 'json' };
// ...

// Import all stats viewer data
import mainStats from '../src/data/main-statsviewer.json' with { type: 'json' };
import unratedStats from '../src/data/unrated-statsviewer.json' with { type: 'json' };
import platformerStats from '../src/data/platformer-statsviewer.json' with { type: 'json' };
import challengeStats from '../src/data/challenge-statsviewer.json' with { type: 'json' };
// ... add other stats viewer imports if you have them

// ... dotenv config ...

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Seed Levels (existing logic)
    await Level.deleteMany({});
    console.log('Cleared old level data.');
    const allLevels = [ /* ... your existing level processing logic ... */ ];
    // ... de-duplication and cleaning ...
    await Level.insertMany(cleanedLevels);
    console.log(`Seeded ${cleanedLevels.length} levels successfully!`);

    // --- NEW: Seed Player Stats ---
    await PlayerStat.deleteMany({});
    console.log('Cleared old player stat data.');
    
    const allPlayerStats = [
      ...mainStats.map(stat => ({ ...stat, listType: 'main' })),
      ...unratedStats.map(stat => ({ ...stat, listType: 'unrated' })),
      ...platformerStats.map(stat => ({ ...stat, listType: 'platformer' })),
      ...challengeStats.map(stat => ({ ...stat, listType: 'challenge' })),
    ];
    
    await PlayerStat.insertMany(allPlayerStats);
    console.log(`Seeded ${allPlayerStats.length} player stats successfully!`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();