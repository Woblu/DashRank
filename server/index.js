import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Level from './models/Level.js';
import PlayerStat from './models/PlayerStat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connection Successful'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use(cors());
app.use(express.json());
app.use('/api/', router); // Use a router for API endpoints

const router = express.Router();
router.get('/lists/:listType', async (req, res) => {
  try {
    const { listType } = req.params;
    const levels = await Level.find({ listType }).sort({ placement: 1 });
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching list', error });
  }
});
// Add other routes to the router here

export default app;
export const handler = serverless(app);