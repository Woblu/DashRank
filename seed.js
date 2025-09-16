// /seed.js
import mongoose from 'mongoose';

// Import all data files using the `with` attribute
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

// --- Mongoose Schemas ---
const RecordSchema = new mongoose.Schema({
  username: String,
  percent: Number,
  videoId: String,
});

const LevelSchema = new mongoose.Schema({
  placement: Number,
  name: String,
  creator: String,
  verifier: String,
  levelId: { type: Number, unique: true, sparse: true },
  videoId: String,
  description: String,
  records: [RecordSchema],
  list: { type: String, required: true, index: true },
});

const PlayerStatSchema = new mongoose.Schema({
  demonlistRank: Number,
  name: String,
  clan: String,
  demonlistScore: Number,
  list: { type: String, required: true, index: true },
});

const Level = mongoose.model('Level', LevelSchema);
const PlayerStat = mongoose.model('PlayerStat', PlayerStatSchema);

const seedDatabase = async () => {
  try {
    // process.env.MONGODB_URI is now provided by the --env-file flag in package.json
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connection successful.');

    console.log('Clearing existing data...');
    await Level.deleteMany({});
    await PlayerStat.deleteMany({});
    console.log('Data cleared.');

    const levelsToSeed = [
      ...mainList.map(level => ({ ...level, list: 'main' })),
      ...unratedList.map(level => ({ ...level, list: 'unrated' })),
      ...platformerList.map(level => ({ ...level, list: 'platformer' })),
      ...futureList.map(level => ({ ...level, list: 'future' })),
      ...challengeList.map(level => ({ ...level, list: 'challenge' })),
      ...speedhackList.map(level => ({ ...level, list: 'speedhack' })),
    ];

    const statsToSeed = [
        ...mainStats.map(stat => ({ ...stat, list: 'main' })),
        ...unratedStats.map(stat => ({ ...stat, list: 'unrated' })),
        ...platformerStats.map(stat => ({ ...stat, list: 'platformer' })),
        ...challengeStats.map(stat => ({ ...stat, list: 'challenge' })),
        ...futureStats.map(stat => ({ ...stat, list: 'future' })),
    ];

    console.log('Inserting new data...');
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