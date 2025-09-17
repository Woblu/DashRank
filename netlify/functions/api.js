import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import mongoose from 'mongoose';

// --- Database Connection ---
let cachedDb = null;
const connectToDatabase = async (uri) => {
  if (cachedDb) {
    return;
  }
  cachedDb = await mongoose.connect(uri);
  console.log("New database connection established.");
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


// --- Express App Setup ---
const app = express();
const router = express.Router();
app.use(cors());

// --- API Endpoints ---
router.get('/lists/:listType', async (req, res) => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    const Level = mongoose.model('Level', LevelSchema);
    const { listType } = req.params;
    const levels = await Level.find({ list: listType }).sort({ placement: 1 }).limit(75);
    
    return res.status(200).json(levels);
  } catch (error) {
    console.error('Error fetching list:', error);
    return res.status(500).json({ error: 'Failed to fetch list data.' });
  }
});

router.get('/level/:levelId', async (req, res) => {
    try {
        await connectToDatabase(process.env.MONGODB_URI);
        const Level = mongoose.model('Level', LevelSchema);
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
        const PlayerStat = mongoose.model('PlayerStat', PlayerStatSchema);
        const { listType } = req.params;
        const stats = await PlayerStat.find({ list: listType }).sort({ demonlistRank: 1 });
        
        if (stats.length > 0) {
            return res.status(200).json(stats);
        } else {
            return res.status(404).json({ error: `Stats for list '${listType}' not found or are empty.` });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: 'Failed to fetch stats data.' });
    }
});

app.use('/api/', router);

export const handler = serverless(app);