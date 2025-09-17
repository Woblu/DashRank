import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Level } from '../../src/models/Level.js';
import { PlayerStat } from '../../src/models/PlayerStat.js';

let cachedDb = null;
const connectToDatabase = async (uri) => {
  if (cachedDb) return;
  cachedDb = await mongoose.connect(uri);
};

const app = express();
const router = express.Router();
router.use(cors());

router.get('/lists/:listType', async (req, res) => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    const { listType } = req.params;
    const levels = await Level.find({ list: listType }).sort({ placement: 1 }).limit(75);
    res.status(200).json(levels);
  } catch (error) {
    console.error('API Error in /lists/:listType:', error);
    res.status(500).json({ error: 'Failed to fetch list data.' });
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
            res.status(200).json(level);
        } else {
            res.status(404).json({ error: `Level with identifier '${levelId}' not found.` });
        }
    } catch (error) {
        console.error('API Error in /level/:levelId:', error);
        res.status(500).json({ error: 'Failed to fetch level data.' });
    }
});

// Use the router for all paths prefixed with '/api'
app.use('/api/', router);

export const handler = serverless(app);