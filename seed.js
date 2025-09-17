import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Level } from './src/models/Level.js';
import { PlayerStat } from './src/models/PlayerStat.js';

// Import all data files
import mainList from './src/data/main-list.json' with { type: 'json' };
import unratedList from './src/data/unrated-list.json' with { type: 'json' };
import platformerList from './src/data/platformer-list.json' with { type: 'json' };
import futureList from './src/data/future-list.json' with { type: 'json' };
import challengeList from './src/data/challenge-list.json' with { type: 'json' };
import speedhackList from './src/data/speedhack-list.json' with { type: 'json' };
import mainStats from './src/data/main-statsviewer.json' with { type: 'json' };
import unratedStats from './src/data/unrated-statsviewer.json' with { type: 'json' };
import platformerStats from './src/data/platformer-statsviewer.json' with { type: 'json' };
import challengeStats from './src/data/challenge-statsviewer.json' with { type: 'json' };
import futureStats from './src/data/future-statsviewer.json' with { type: 'json' };

dotenv.config();

const cleanLevelData = (level, listType) => ({
  ...level,
  placement: parseInt(level.placement, 10),
  levelId: level.levelId ? parseInt(level.levelId, 10) : undefined,
  list: listType,
});

const seedDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in your .env file.");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connection successful.');

    console.log('Clearing existing data...');
    await Level.deleteMany({});
    await PlayerStat.deleteMany({});
    console.log('Data cleared.');

    const levelsToSeed = [
      ...mainList.map(l => cleanLevelData(l, 'main')),
      ...unratedList.map(l => cleanLevelData(l, 'unrated')),
      ...platformerList.map(l => cleanLevelData(l, 'platformer')),
      ...futureList.map(l => cleanLevelData(l, 'future')),
      ...challengeList.map(l => cleanLevelData(l, 'challenge')),
      ...speedhackList.map(l => cleanLevelData(l, 'speedhack')),
    ];

    const statsToSeed = [
        ...mainStats.map(stat => ({ ...stat, list: 'main' })),
        ...unratedStats.map(stat => ({ ...stat, list: 'unrated' })),
        ...platformerStats.map(stat => ({ ...stat, list: 'platformer' })),
        ...challengeStats.map(stat => ({ ...stat, list: 'challenge' })),
        ...futureStats.map(stat => ({ ...stat, list: 'future' })),
    ];

    console.log('Inserting cleaned data...');
    await Level.insertMany(levelsToSeed);
    await PlayerStat.insertMany(statsToSeed);
    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDatabase();