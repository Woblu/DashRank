// netlify/functions/api.js
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';

// Import all your list data directly.
// Note the relative paths from this function file to your data folder.
import mainList from '../../src/data/main-list.json';
import unratedList from '../../src/data/unrated-list.json';
import platformerList from '../../src/data/platformer-list.json';
import futureList from '../../src/data/future-list.json';
import challengeList from '../../src/data/challenge-list.json';
import speedhackList from '../../src/data/speedhack-list.json';
// Add any other lists you have here

const allLists = {
  main: mainList,
  unrated: unratedList,
  platformer: platformerList,
  future: futureList,
  challenge: challengeList,
  speedhack: speedhackList,
};

const app = express();
const router = express.Router();

// Apply CORS middleware
app.use(cors());

router.get('/lists/:listType', (req, res) => {
  const { listType } = req.params;
  const listData = allLists[listType];

  if (listData) {
    res.json(listData);
  } else {
    res.status(404).json({ error: 'List not found' });
  }
});

// The path prefix '/api' is handled by the Netlify redirect.
// So in this file, we just define the routes relative to the function's entry point.
app.use('/', router);

export const handler = serverless(app);