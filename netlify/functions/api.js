import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';

const app = express();
const router = express.Router();
router.use(cors());

// This route now sends a simple, hardcoded array instead of connecting to the database.
router.get('/lists/:listType', (req, res) => {
  const fakeData = [
    { placement: 1, name: "Test Level A (API is working)", creator: "RobTop-GPT", levelId: 1, videoId: "dQw4w9WgXcQ" },
    { placement: 2, name: "Test Level B (API is working)", creator: "RobTop-GPT", levelId: 2, videoId: "dQw4w9WgXcQ" }
  ];
  res.status(200).json(fakeData);
});

// We'll have other routes send a simple message for now.
router.get('/level/:levelId', (req, res) => {
    res.status(404).json({ error: "Level detail test not implemented." });
});

app.use('/', router);

export const handler = serverless(app);