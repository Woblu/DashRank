// api/index.js
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken'; // Keep jwt import if used in middleware below

// Import handlers from their respective files
import * as authHandlers from '../src/server/authHandlers.js'; // Ensure correct path
import * as friendHandlers from '../src/server/friendHandlers.js'; // Ensure correct path
import * as layoutHandlers from '../src/server/layoutHandlers.js'; // Ensure correct path
import * as userHandlers from '../src/server/userHandlers.js'; // Ensure correct path
import * as accountHandlers from '../src/server/accountHandlers.js'; // Ensure correct path
import * as personalRecordHandlers from '../src/server/personalRecordHandlers.js'; // Ensure correct path
import * as moderationHandlers from '../src/server/moderationHandlers.js'; // Ensure correct path
import * as collaborationHandlers from '../src/server/collaborationHandlers.js'; // Ensure correct path
import * as partHandlers from '../src/server/partHandlers.js'; // Ensure correct path
import * as chatHandlers from '../src/server/chatHandlers.js'; // Ensure correct path
import * as listManagementHandlers from '../src/server/listsManagementHandlers.js'; // Ensure correct path

// Import the player stats handler
import { getPlayerStats } from '../src/server/playerStatsHandlers.js'; // Ensure correct path
import { PrismaClient } from '@prisma/client'; // Import PrismaClient here

const prisma = new PrismaClient();
const app = express();
app.use(cors()); // Use CORS
app.use(express.json()); // Use express JSON parsing middleware

// --- Authentication Middleware Definitions ---
const authenticateToken = (req, res, next) => {
    // Your JWT verification logic here...
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log("[AuthMiddleware] No token provided.");
        return res.sendStatus(401); // if there isn't any token
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("[AuthMiddleware] JWT Verification Error:", err.message); // Log error
            return res.sendStatus(403); // Forbidden if token is invalid
        }
        req.user = user; // Add decoded user payload to request object
        console.log("[AuthMiddleware] Token verified successfully for user:", user.userId);
        next(); // pass the execution off to whatever request the client intended
    });
};

const isModeratorOrAdmin = (req, res, next) => {
     // Ensure req.user exists from authenticateToken middleware
     if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR')) {
        console.log(`[AuthMiddleware] User ${req.user.userId} has role ${req.user.role}. Allowing access.`);
        next();
    } else {
        const userRole = req.user ? req.user.role : 'None (No user attached)';
        console.log(`[AuthMiddleware] Access Forbidden. User role: ${userRole}. Requires Moderator or Admin.`);
        res.status(403).json({ message: 'Forbidden: Requires Moderator or Admin role' });
    }
};
// Add isAdmin if needed separately, e.g.:
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
         const userRole = req.user ? req.user.role : 'None (No user attached)';
         console.log(`[AuthMiddleware] Access Forbidden. User role: ${userRole}. Requires Admin.`);
        res.status(403).json({ message: 'Forbidden: Requires Admin role' });
    }
};


// --- PUBLIC ROUTES (BEFORE AUTH MIDDLEWARE) ---

// Auth
app.post('/api/auth/login', authHandlers.loginUser); // Handles POST /api/auth with action:'login' potentially
app.post('/api/register', authHandlers.registerUser);

// Public Lists / Levels
app.get('/api/lists/:listName', async (req, res) => {
    try {
        const { listName } = req.params;
        console.log(`[Public Route] Fetching list: ${listName}`);
        const levels = await prisma.level.findMany({
            where: { list: listName },
            orderBy: { placement: 'asc' }
        });
        res.status(200).json(levels);
    } catch (error) {
        console.error(`[Public Route] Error fetching list ${req.params.listName}:`, error);
        res.status(500).json({ message: "Failed to fetch list." });
    }
});
app.get('/api/level/:levelId', async (req, res) => {
     try {
        const { levelId } = req.params;
        const { list } = req.query; // Optional list filter
        console.log(`[Public Route] Fetching level ID/Slug: ${levelId}, List filter: ${list || 'None'}`);

        // Attempt to parse levelId as Int first for GD ID lookup
        const gdLevelId = parseInt(levelId, 10);
        let level = null;

        if (!isNaN(gdLevelId)) {
             console.log(`[Public Route] Attempting lookup by GD Level ID: ${gdLevelId}`);
             level = await prisma.level.findFirst({
                 where: {
                     levelId: gdLevelId, // Match Geometry Dash Level ID
                     ...(list && { list: list }) // Add list filter if provided
                 }
             });
        }

        // If not found by Int ID, try finding by Prisma's ObjectId string
        // Basic ObjectId format check - adjust if your IDs differ
        if (!level && /^[a-f\d]{24}$/i.test(levelId)) {
             console.log(`[Public Route] Attempting lookup by Prisma ID: ${levelId}`);
             level = await prisma.level.findFirst({
                 where: {
                     id: levelId, // Match Prisma's ID
                     ...(list && { list: list })
                 }
             });
        }
        // Add lookup by name/slug if needed
        // else if (!level) { /* try find by name */}


        if (level) {
            console.log(`[Public Route] Found level: ${level.name}`);
            res.status(200).json(level);
        } else {
            console.log(`[Public Route] Level not found for ID/Slug: ${levelId}`);
            res.status(404).json({ message: 'Level not found' });
        }
    } catch (error) {
        console.error(`[Public Route] Error fetching level ${req.params.levelId}:`, error);
        res.status(500).json({ message: "Failed to fetch level details." });
    }
});
app.get('/api/lists/main-list/history', listManagementHandlers.getHistoricList);
app.get('/api/layouts', layoutHandlers.listLayouts);
app.get('/api/layouts/:layoutId', (req, res) => layoutHandlers.getLayoutById(req, res, req.params.layoutId));

// Public Player Stats Route
app.get('/api/player-stats/:playerName', (req, res) => getPlayerStats(req, res)); // Pass req, res


// --- PROTECTED ROUTES (AFTER AUTH MIDDLEWARE) ---
// Any route defined below this line will require a valid JWT token
app.use(authenticateToken);

// Users (Get self, Pin record)
app.get('/api/users', (req, res) => userHandlers.getUser(req, res, req.user)); // Pass decoded token (now in req.user)
app.post('/api/users', (req, res) => userHandlers.pinRecord(req, res, req.user));

// Layout Reports (Create)
app.post('/api/layout-reports', (req, res) => moderationHandlers.createLayoutReport(req, res, req.user));

// Personal Records (tied to logged-in user)
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

// Account Management
app.put('/api/account', (req, res) => accountHandlers.updateAccount(req, res, req.user));

// Layout Sub-routes (Applicants, Parts - Check if creator needs auth)
// These might need specific owner checks inside the handlers
app.get('/api/layouts/:layoutId/applicants', (req, res) => collaborationHandlers.listLayoutApplicants(req, res, req.params.layoutId));
app.get('/api/layouts/:layoutId/parts-and-team', (req, res) => partHandlers.getLayoutPartsAndTeam(req, res, req.params.layoutId));

// Collaboration
app.post('/api/collaboration-requests', (req, res) => collaborationHandlers.applyToLayout(req, res, req.user));
app.put('/api/collaboration-requests/update', (req, res) => collaborationHandlers.updateApplicationStatus(req, res, req.user)); // Might need owner check

// Parts (Need owner/assignee checks inside handlers)
app.post('/api/parts/create', (req, res) => partHandlers.createPart(req, res, req.user));
app.put('/api/parts/assign', (req, res) => partHandlers.assignPart(req, res, req.user));
app.put('/api/parts/status', (req, res) => partHandlers.updatePartStatus(req, res, req.user));
app.delete('/api/parts/delete', (req, res) => partHandlers.deletePart(req, res, req.user));

// Chat (Need member checks inside handlers)
app.get('/api/chat/history/:layoutId', (req, res) => chatHandlers.getConversationHistory(req, res, req.params.layoutId, req.user));
app.post('/api/chat/post', (req, res) => chatHandlers.postMessage(req, res, req.user));

// Level History (Protected?) - Decide if public or needs auth
app.get('/api/levels/:levelId/history', (req, res) => listManagementHandlers.getLevelHistory(req, res, req.params.levelId));


// --- Admin/Moderator Routes ---
// Apply stricter middleware to all routes starting with /api/admin
app.use('/api/admin', isModeratorOrAdmin);

app.post('/api/admin/add-level', listManagementHandlers.addLevelToList);
app.put('/api/admin/move-level', listManagementHandlers.moveLevelInList);
app.delete('/api/admin/remove-level', listManagementHandlers.removeLevelFromList);
app.put('/api/admin/update-level', listManagementHandlers.updateLevel);

app.get('/api/admin/submissions', moderationHandlers.listSubmissions);
app.post('/api/admin/update-submission', moderationHandlers.updateSubmissionStatus);
app.get('/api/admin/layout-reports', moderationHandlers.listLayoutReports);
app.put('/api/admin/layout-reports', moderationHandlers.updateReportStatus);
app.delete('/api/admin/layouts', layoutHandlers.deleteLayoutByAdmin);
app.put('/api/admin/users/ban', moderationHandlers.banUserFromWorkshop);


// --- Vercel Export (with manual param parsing for serverless environment) ---
export default async function (req, res) {
  // Simple logging for incoming requests
  console.log(`[API Index] Incoming Request: ${req.method} ${req.url}`);

  // Add req.params for dynamic routes based on URL structure
  // This needs to be robust enough for all your dynamic routes
  const urlParts = req.url.split('?')[0].split('/').filter(Boolean); // api, route, param1, param2...
  req.params = {};

  try {
      if (urlParts[0] === 'api') {
          if (urlParts[1] === 'player-stats' && urlParts[2]) {
              req.params.playerName = urlParts[2];
          } else if (urlParts[1] === 'lists' && urlParts[2] && urlParts[3] === 'history') { // e.g., /api/lists/main-list/history
              // Specific handler for main list history is already defined
          } else if (urlParts[1] === 'lists' && urlParts[2]) { // e.g., /api/lists/main-list
              req.params.listName = urlParts[2];
          } else if (urlParts[1] === 'level' && urlParts[2]) { // e.g., /api/level/12345 or /api/level/level-slug
              req.params.levelId = urlParts[2]; // Handler needs to parse Int or check string ID
          } else if (urlParts[1] === 'layouts' && urlParts[2] && urlParts[3] === 'applicants') { // e.g., /api/layouts/abc/applicants
              req.params.layoutId = urlParts[2];
          } else if (urlParts[1] === 'layouts' && urlParts[2] && urlParts[3] === 'parts-and-team') { // e.g., /api/layouts/abc/parts-and-team
              req.params.layoutId = urlParts[2];
          } else if (urlParts[1] === 'layouts' && urlParts[2]) { // e.g., /api/layouts/abc
              req.params.layoutId = urlParts[2];
          } else if (urlParts[1] === 'personal-records' && urlParts[2]) { // e.g., /api/personal-records/abc
              req.params.recordId = urlParts[2];
          } else if (urlParts[1] === 'chat' && urlParts[2] === 'history' && urlParts[3]) { // e.g., /api/chat/history/abc
              req.params.layoutId = urlParts[3];
          } else if (urlParts[1] === 'levels' && urlParts[2] && urlParts[3] === 'history') { // e.g., /api/levels/abc/history
              req.params.levelId = urlParts[2];
          }
          // Add more `else if` blocks here for other dynamic routes like /api/admin/... if they use params
      }

      // Pass the request to the Express app instance
      await app(req, res);

  } catch (error) {
      // Catch any unexpected errors during routing or middleware
      console.error("[API Index] Unhandled error during request processing:", error);
      if (!res.headersSent) { // Check if headers were already sent
          res.status(500).json({ message: 'Internal Server Error' });
      }
  }
}