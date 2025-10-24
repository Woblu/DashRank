import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import express from 'express'; // Assuming you might use express features directly later
import cors from 'cors'; // Assuming you use cors

// Import handlers from their respective files
import * as authHandlers from '../src/server/authHandlers.js';
import * as friendHandlers from '../src/server/friendHandlers.js';
import * as layoutHandlers from '../src/server/layoutHandlers.js';
import * as userHandlers from '../src/server/userHandlers.js';
import * as accountHandlers from '../src/server/accountHandlers.js';
import * as personalRecordHandlers from '../src/server/personalRecordHandlers.js';
import * as moderationHandlers from '../src/server/moderationHandlers.js';
import * as collaborationHandlers from '../src/server/collaborationHandlers.js';
import * as partHandlers from '../src/server/partHandlers.js';
import * as chatHandlers from '../src/server/chatHandlers.js';
import * as listManagementHandlers from '../src/server/listsManagementHandlers.js';

// [NEW] Import the player stats handler
import { getPlayerStats } from '../src/server/playerStatsHandlers.js'; // Adjust path if needed

const prisma = new PrismaClient(); // Keep Prisma instance

// Simplified Express app setup within the handler for Vercel
const app = express();
app.use(cors()); // Use CORS
app.use(express.json()); // Use express JSON parsing middleware

// --- Authentication Middleware (Example) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // Add decoded user payload to request
        next(); // pass the execution off to whatever request the client intended
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN')) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires Admin role' });
    }
};

const isModeratorOrAdmin = (req, res, next) => {
     if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR')) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires Moderator or Admin role' });
    }
};


// --- Route Definitions ---

// Auth
app.post('/api/auth/login', authHandlers.loginUser); // Assuming loginUser exists
app.post('/api/register', authHandlers.registerUser); // Assuming registerUser exists

// Public Lists / Levels
app.get('/api/lists/:listName', async (req, res) => {
    try {
        const { listName } = req.params;
        const levels = await prisma.level.findMany({
            where: { list: listName },
            orderBy: { placement: 'asc' }
        });
        res.status(200).json(levels);
    } catch (error) {
        console.error("Error fetching list:", error);
        res.status(500).json({ message: "Failed to fetch list." });
    }
});

app.get('/api/level/:levelId', async (req, res) => {
    try {
        const { levelId } = req.params;
        const { list } = req.query; // Optional list filter
        // Attempt to parse levelId as Int first for GD ID lookup
        const gdLevelId = parseInt(levelId, 10);
        let level = null;

        if (!isNaN(gdLevelId)) {
             level = await prisma.level.findFirst({
                 where: {
                     levelId: gdLevelId, // Match Geometry Dash Level ID
                     ...(list && { list: list }) // Add list filter if provided
                 }
             });
        }

        // If not found by Int ID, try finding by Prisma's ObjectId string
        // This requires careful handling as ObjectId might be passed in URL
        if (!level && /^[a-f\d]{24}$/i.test(levelId)) { // Basic ObjectId format check
             level = await prisma.level.findFirst({
                 where: {
                     id: levelId, // Match Prisma's ID
                     ...(list && { list: list })
                 }
             });
        }


        if (level) {
            res.status(200).json(level);
        } else {
            res.status(404).json({ message: 'Level not found' });
        }
    } catch (error) {
        console.error("Error fetching level details:", error);
        res.status(500).json({ message: "Failed to fetch level details." });
    }
});

app.get('/api/lists/main-list/history', listManagementHandlers.getHistoricList);
app.get('/api/layouts', layoutHandlers.listLayouts);
app.get('/api/layouts/:layoutId', (req, res) => layoutHandlers.getLayoutById(req, res, req.params.layoutId));

// [NEW] Public Player Stats Route
app.get('/api/player-stats/:playerName', (req, res) => getPlayerStats(req, res)); // Pass req, res

// --- Protected Routes ---
app.use(authenticateToken); // Apply auth middleware to all routes below

// Users
app.get('/api/users', (req, res) => userHandlers.getUser(req, res, req.user)); // Pass decoded token (now in req.user)
app.post('/api/users', (req, res) => userHandlers.pinRecord(req, res, req.user));

// Layout Reports
app.post('/api/layout-reports', (req, res) => moderationHandlers.createLayoutReport(req, res, req.user));

// Personal Records
app.get('/api/personal-records', (req, res) => personalRecordHandlers.listPersonalRecords(req, res, req.user));
app.post('/api/personal-records', (req, res) => personalRecordHandlers.createPersonalRecord(req, res, req.user));
app.delete('/api/personal-records', (req, res) => personalRecordHandlers.deletePersonalRecord(req, res, req.user));
app.get('/api/personal-records/:recordId', (req, res) => personalRecordHandlers.getPersonalRecordById(req, res, req.user, req.params.recordId));
app.put('/api/personal-records/:recordId', (req, res) => personalRecordHandlers.updatePersonalRecord(req, res, req.user, req.params.recordId));

// Friends
app.get('/api/friends', (req, res) => friendHandlers.listFriends(req, res, req.user));
app.post('/api/friends', (req, res) => friendHandlers.sendFriendRequest(req, res, req.user));
app.put('/api/friends', (req, res) => friendHandlers.respondToFriendRequest(req, res, req.user));

// Layouts (Create)
app.post('/api/layouts', (req, res) => layoutHandlers.createLayout(req, res, req.user));

// Account
app.put('/api/account', (req, res) => accountHandlers.updateAccount(req, res, req.user));

// Layout Sub-routes (Applicants, Parts)
app.get('/api/layouts/:layoutId/applicants', (req, res) => collaborationHandlers.listLayoutApplicants(req, res, req.params.layoutId));
app.get('/api/layouts/:layoutId/parts-and-team', (req, res) => partHandlers.getLayoutPartsAndTeam(req, res, req.params.layoutId));

// Collaboration
app.post('/api/collaboration-requests', (req, res) => collaborationHandlers.applyToLayout(req, res, req.user));
app.put('/api/collaboration-requests/update', (req, res) => collaborationHandlers.updateApplicationStatus(req, res, req.user));

// Parts
app.post('/api/parts/create', (req, res) => partHandlers.createPart(req, res, req.user));
app.put('/api/parts/assign', (req, res) => partHandlers.assignPart(req, res, req.user));
app.put('/api/parts/status', (req, res) => partHandlers.updatePartStatus(req, res, req.user));
app.delete('/api/parts/delete', (req, res) => partHandlers.deletePart(req, res, req.user));

// Chat
app.get('/api/chat/history/:layoutId', (req, res) => chatHandlers.getConversationHistory(req, res, req.params.layoutId, req.user));
app.post('/api/chat/post', (req, res) => chatHandlers.postMessage(req, res, req.user));

// Level History (Protected?) - Decide if this needs auth
app.get('/api/levels/:levelId/history', (req, res) => listManagementHandlers.getLevelHistory(req, res, req.params.levelId));

// --- Admin/Moderator Routes ---
// Apply stricter middleware
app.use('/api/admin', isModeratorOrAdmin); // Apply to all /api/admin/* routes

app.post('/api/admin/add-level', listManagementHandlers.addLevelToList);
app.put('/api/admin/move-level', listManagementHandlers.moveLevelInList);
app.delete('/api/admin/remove-level', listManagementHandlers.removeLevelFromList);
app.put('/api/admin/update-level', listManagementHandlers.updateLevel); // Add update route if needed

app.get('/api/admin/submissions', moderationHandlers.listSubmissions);
app.post('/api/admin/update-submission', moderationHandlers.updateSubmissionStatus);
app.get('/api/admin/layout-reports', moderationHandlers.listLayoutReports);
app.put('/api/admin/layout-reports', moderationHandlers.updateReportStatus);
app.delete('/api/admin/layouts', layoutHandlers.deleteLayoutByAdmin);
app.put('/api/admin/users/ban', moderationHandlers.banUserFromWorkshop);


// --- Vercel Export ---
export default async function (req, res) {
  // Add req.params for dynamic routes if not using a framework adapter
  const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
  req.params = {};
  // Basic dynamic route matching (adjust patterns as needed)
  if (urlParts[0] === 'api' && urlParts[1] === 'player-stats' && urlParts[2]) {
      req.params.playerName = urlParts[2];
  } else if (urlParts[0] === 'api' && urlParts[1] === 'lists' && urlParts[2] && urlParts[2] !== 'main-list') {
       req.params.listName = urlParts[2];
  } else if (urlParts[0] === 'api' && urlParts[1] === 'level' && urlParts[2]) {
       req.params.levelId = urlParts[2]; // Might need further parsing Int/String
  } else if (urlParts[0] === 'api' && urlParts[1] === 'layouts' && urlParts[2] && !['applicants', 'parts-and-team'].includes(urlParts[3])) {
       req.params.layoutId = urlParts[2];
  } else if (urlParts[0] === 'api' && urlParts[1] === 'personal-records' && urlParts[2]) {
      req.params.recordId = urlParts[2];
  } else if (urlParts[0] === 'api' && urlParts[1] === 'layouts' && urlParts[2] && ['applicants', 'parts-and-team'].includes(urlParts[3])) {
      req.params.layoutId = urlParts[2];
      // req.params.subRoute = urlParts[3]; // Optionally add subroute param
  } else if (urlParts[0] === 'api' && urlParts[1] === 'chat' && urlParts[2] === 'history' && urlParts[3]) {
      req.params.layoutId = urlParts[3];
  } else if (urlParts[0] === 'api' && urlParts[1] === 'levels' && urlParts[2] && urlParts[3] === 'history') {
      req.params.levelId = urlParts[2];
  }
  // Add more param matching logic here for other dynamic routes...

  await app(req, res); // Pass request to the Express app instance
}