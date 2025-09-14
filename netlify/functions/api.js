import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import serverless from 'serverless-http';

// Correctly import your Mongoose models from the 'server' directory
import Level from '../../server/models/Level.js';
import PlayerStat from '../../server/models/PlayerStat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct the path to the .env file at the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const MONGO_URI = process.env.MONGO_URI;

// Establish MongoDB connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connection Successful'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Define the router *before* using it
const router = express.Router();

// Setup middleware
app.use(cors());
app.use(express.json());
app.use('/api/', router); // This path is handled by Netlify redirects

// Define your API routes
router.get('/lists/:listType', async (req, res) => {
  try {
    const { listType } = req.params;
    const levels = await Level.find({ listType }).sort({ placement: 1 });
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching list', error });
  }
});

// Add any other routes here using the 'router' object

// Export the serverless handler
export const handler = serverless(app);