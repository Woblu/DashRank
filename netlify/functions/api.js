// netlify/functions/api.js
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import mongoose from 'mongoose';

// --- Database Connection ---
// This pattern caches the connection between function invocations.
let cachedDb = null;
const connectToDatabase = async (uri) => {
  if (cachedDb) {
    return;
  }
  cachedDb = await mongoose.connect(uri);
};

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

// --- Mongoose Models (Robust Pattern) ---
// This prevents errors in serverless environments where models might be re-compiled.
const Level = mongoose.models.Level || mongoose.model('Level', LevelSchema);
const PlayerStat = mongoose.models.PlayerStat || mongoose.model('PlayerStat', PlayerStatSchema);

// --- Express App Setup ---
const app = express();
const router = express.Router();
app.use(cors());

// --- API Endpoints ---

router.get('/lists/:listType', async (req, res) => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    const { listType } = req.params;
    const levels = await Level.find({ list: listType }).sort({ placement: 1 }).limit(75);
    
    // Even if the list is empty, return an empty array, not a 404, to prevent frontend crashes.
    return res.status(200).json(levels);
  } catch (error) {
    console.error('Error fetching list:', error);
    return res.status(500).json({ error: 'Failed to fetch list data.' });
  }
});

router.get('/level/:levelId', async (req, res) => {
    try {
        await connectToDatabase(process.env.MONGODB_URI);
        const { levelId } = req.params;
        const identifier = parseInt(levelId, 10);
        
        const level = await Level.findOne({ 
            $or: [{ levelId: identifier }, { placement: identifier, list: 'challenge' }] 
        });

        if (level) {
            return res.status(200).json(level);
        } else {
            return res.status(404).json({ error: `Level with identifier '${levelId}' not found.` });
        }
    } catch (error) {
        console.error('Error fetching level:', error);
        return res.status(500).json({ error: 'Failed to fetch level data.' });
    }
});

router.get('/stats/:listType', async (req, res) => {
    try {
        await connectToDatabase(process.env.MONGODB_URI);
        const { listType } = req.params;
        const stats = await PlayerStat.find({ list: listType }).sort({ demonlistRank: 1 });
        
        return res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: 'Failed to fetch stats data.' });
    }
});

// The path is relative to the function's endpoint, so we use '/'
app.use('/', router);

export const handler = serverless(app);