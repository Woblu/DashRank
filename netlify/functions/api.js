// netlify/functions/api.js
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import mongoose from 'mongoose';

// --- Mongoose Schemas (no changes needed) ---
const RecordSchema = new mongoose.Schema({
  username: { type: String, required: true },
  percent: { type: Number, required: true },
  videoId: { type: String, required: true },
});
const LevelSchema = new mongoose.Schema({
  placement: { type: Number, required: true },
  name: { type: String, required: true },
  creator: { type: String, required: true },
  verifier: { type: String, required: true },
  levelId: { type: Number, unique: true, sparse: true },
  videoId: String,
  description: String,
  records: [RecordSchema],
  list: { type: String, required: true, index: true }
});
const PlayerStatSchema = new mongoose.Schema({
  demonlistRank: { type: Number, required: true },
  name: { type: String, required: true },
  clan: String,
  demonlistScore: { type: Number, required: true },
  list: { type: String, required: true, index: true }
});

const Level = mongoose.models.Level || mongoose.model('Level', LevelSchema);
const PlayerStat = mongoose.models.PlayerStat || mongoose.model('PlayerStat', PlayerStatSchema);

// --- Database Connection (no changes needed) ---
let cachedDb = null;
const connectToDatabase = async () => {
  if (cachedDb) {
    return cachedDb;
  }
  const db = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = db;
  return db;
};

// --- Express App Setup ---
const app = express();
const router = express.Router();
app.use(cors());

// --- API Endpoints (no changes needed) ---
router.get('/lists/:listType', async (req, res) => {
  try {
    await connectToDatabase();
    const { listType } = req.params;
    const levels = await Level.find({ list: listType }).sort({ placement: 1 }).limit(75);
    
    if (levels.length > 0) {
      res.json(levels);
    } else {
      res.status(404).json({ error: `List '${listType}' not found or is empty.` });
    }
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list data.' });
  }
});

router.get('/level/:levelId', async (req, res) => {
    try {
        await connectToDatabase();
        const { levelId } = req.params;
        const identifier = parseInt(levelId, 10);
        
        const level = await Level.findOne({ 
            $or: [{ levelId: identifier }, { placement: identifier, list: 'challenge' }] 
        });

        if (level) {
            res.json(level);
        } else {
            res.status(404).json({ error: `Level with identifier '${levelId}' not found.` });
        }
    } catch (error) {
        console.error('Error fetching level:', error);
        res.status(500).json({ error: 'Failed to fetch level data.' });
    }
});

router.get('/stats/:listType', async (req, res) => {
    try {
        await connectToDatabase();
        const { listType } = req.params;
        const stats = await PlayerStat.find({ list: listType }).sort({ demonlistRank: 1 });
        
        if (stats.length > 0) {
            res.json(stats);
        } else {
            res.status(404).json({ error: `Stats for list '${listType}' not found or are empty.` });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats data.' });
    }
});

// --- THIS IS THE FIX ---
// Mount the router on the '/api' path.
app.use('/api/', router);

export const handler = serverless(app);