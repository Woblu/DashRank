// api/index.js
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

// Import handlers
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
import { getPlayerStats } from '../src/server/playerStatsHandlers.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Middleware Definitions ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log("[AuthMiddleware] No token provided.");
        return res.status(401).json({ message: 'Unauthorized: Token required.' }); // Send JSON response
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("[AuthMiddleware] JWT Verification Error:", err.message);
            return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' }); // Send JSON response
        }
        req.user = user;
        console.log("[AuthMiddleware] Token verified for user:", user.userId);
        next();
    });
};

const isModeratorOrAdmin = (req, res, next) => {
     if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR')) {
        next();
    } else { res.status(4GE).json({ message: 'Forbidden: Requires Moderator or Admin role' }); }
};
// Add isAdmin if needed

// --- Vercel Serverless Function Handler ---
export default async function handler(req, res) {
    // Apply CORS globally
    cors()(req, res, async () => {
        // Parse JSON body
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            try {
                let body = '';
                for await (const chunk of req) { body += chunk; }
                if (body) req.body = JSON.parse(body);
            } catch (e) {
                console.error("Error parsing JSON body:", e);
                return res.status(400).json({ message: 'Invalid JSON body.' });
            }
        }

        // --- Simple Router Logic ---
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname;
        req.query = Object.fromEntries(url.searchParams); // Attach query params
        req.params = {}; // Initialize params

        console.log(`[API Router] Request: ${req.method} ${path}`);

        try {
            // --- PUBLIC ROUTES (Checked FIRST) ---

            // ** FIX: Match /api/auth specifically for login **
            if (req.method === 'POST' && path === '/api/auth') {
                // Assuming loginUser handles the logic based on req.body.action or similar
                console.log("[API Router] Routing to loginUser handler for /api/auth");
                return await authHandlers.loginUser(req, res);
            }
            if (req.method === 'POST' && path === '/api/register') {
                 console.log("[API Router] Routing to registerUser handler for /api/register");
                return await authHandlers.registerUser(req, res);
            }

            // Public Lists (e.g., /api/lists/main-list)
            const listMatch = path.match(/^\/api\/lists\/([a-zA-Z0-9_-]+)$/);
            if (req.method === 'GET' && listMatch && listMatch[1] !== 'main-list/history') { // Exclude history subpath
                req.params.listName = listMatch[1];
                console.log(`[API Router] Routing to list fetch handler for list: ${req.params.listName}`);
                return await prisma.level.findMany({
                    where: { list: req.params.listName }, orderBy: { placement: 'asc' }
                }).then(levels => res.status(200).json(levels))
                  .catch(error => { console.error(`Error fetching list ${req.params.listName}:`, error); res.status(500).json({ message: "Failed to fetch list."}); });
            }

            // Public Level Details (e.g., /api/level/12345 or /api/level/objectid)
             const levelMatch = path.match(/^\/api\/level\/([a-zA-Z0-9]+)$/); // Matches digits or ObjectId
             if (req.method === 'GET' && levelMatch) {
                 req.params.levelId = levelMatch[1];
                 const { levelId } = req.params;
                 const { list } = req.query;
                 console.log(`[API Router] Routing to level fetch handler for ID/Slug: ${levelId}`);
                 const gdLevelId = parseInt(levelId, 10);
                 let level = null;
                 if (!isNaN(gdLevelId)) { level = await prisma.level.findFirst({ where: { levelId: gdLevelId, ...(list && { list: list }) } }); }
                 if (!level && /^[a-f\d]{24}$/i.test(levelId)) { level = await prisma.level.findFirst({ where: { id: levelId, ...(list && { list: list }) } }); }
                 if (level) { return res.status(200).json(level); }
                 else { return res.status(404).json({ message: 'Level not found' }); }
            }

             // Other public routes
             if (req.method === 'GET' && path === '/api/lists/main-list/history') {
                  console.log("[API Router] Routing to getHistoricList handler");
                 return await listManagementHandlers.getHistoricList(req, res);
            }
             if (req.method === 'GET' && path === '/api/layouts') {
                  console.log("[API Router] Routing to listLayouts handler");
                 return await layoutHandlers.listLayouts(req, res);
            }
            const layoutDetailMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)$/);
             if (req.method === 'GET' && layoutDetailMatch && !path.includes('/applicants') && !path.includes('/parts-and-team')) {
                 req.params.layoutId = layoutDetailMatch[1];
                  console.log(`[API Router] Routing to getLayoutById handler for ID: ${req.params.layoutId}`);
                 return await layoutHandlers.getLayoutById(req, res, req.params.layoutId);
            }
             const playerStatsMatch = path.match(/^\/api\/player-stats\/([a-zA-Z0-9%_-]+)$/); // Allow encoded chars
             if (req.method === 'GET' && playerStatsMatch) {
                 req.params.playerName = playerStatsMatch[1];
                  console.log(`[API Router] Routing to getPlayerStats handler for player: ${req.params.playerName}`);
                 return await getPlayerStats(req, res); // Call the handler
            }


            // --- If none of the public routes matched, apply Authentication ---
            console.log(`[API Router] Path ${path} did not match public routes. Applying authentication.`);
            authenticateToken(req, res, async () => {
                // Route handler logic inside authenticateToken callback
                console.log(`[API Router] Authentication successful for ${req.method} ${path}. Routing protected request...`);

                // Re-check path and method for protected routes
                if (req.method === 'GET' && path === '/api/users') return await userHandlers.getUser(req, res, req.user);
                if (req.method === 'POST' && path === '/api/users') return await userHandlers.pinRecord(req, res, req.user);

                if (req.method === 'POST' && path === '/api/layout-reports') return await moderationHandlers.createLayoutReport(req, res, req.user);

                // Personal Records
                if (path === '/api/personal-records') {
                    if (req.method === 'GET') return await personalRecordHandlers.listPersonalRecords(req, res, req.user);
                    if (req.method === 'POST') return await personalRecordHandlers.createPersonalRecord(req, res, req.user);
                    if (req.method === 'DELETE') return await personalRecordHandlers.deletePersonalRecord(req, res, req.user);
                }
                const prDetailMatch = path.match(/^\/api\/personal-records\/([a-zA-Z0-9]+)$/);
                if (prDetailMatch) {
                    req.params = { recordId: prDetailMatch[1] };
                    if (req.method === 'GET') return await personalRecordHandlers.getPersonalRecordById(req, res, req.user, req.params.recordId);
                    if (req.method === 'PUT') return await personalRecordHandlers.updatePersonalRecord(req, res, req.user, req.params.recordId);
                }

                // Friends
                if (path === '/api/friends') {
                    if (req.method === 'GET') return await friendHandlers.listFriends(req, res, req.user);
                    if (req.method === 'POST') return await friendHandlers.sendFriendRequest(req, res, req.user);
                    if (req.method === 'PUT') return await friendHandlers.respondToFriendRequest(req, res, req.user);
                }

                // Layouts (Create)
                if (req.method === 'POST' && path === '/api/layouts') return await layoutHandlers.createLayout(req, res, req.user);
                // Account
                if (req.method === 'PUT' && path === '/api/account') return await accountHandlers.updateAccount(req, res, req.user);

                // Layout Sub-routes
                const layoutApplicantsMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)\/applicants$/);
                if (req.method === 'GET' && layoutApplicantsMatch) {
                    req.params = { layoutId: layoutApplicantsMatch[1] };
                    return await collaborationHandlers.listLayoutApplicants(req, res, req.params.layoutId);
                }
                const layoutPartsTeamMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)\/parts-and-team$/);
                if (req.method === 'GET' && layoutPartsTeamMatch) {
                    req.params = { layoutId: layoutPartsTeamMatch[1] };
                    return await partHandlers.getLayoutPartsAndTeam(req, res, req.params.layoutId);
                }

                // Collaboration
                if (req.method === 'POST' && path === '/api/collaboration-requests') return await collaborationHandlers.applyToLayout(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/collaboration-requests/update') return await collaborationHandlers.updateApplicationStatus(req, res, req.user);

                // Parts
                if (req.method === 'POST' && path === '/api/parts/create') return await partHandlers.createPart(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/parts/assign') return await partHandlers.assignPart(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/parts/status') return await partHandlers.updatePartStatus(req, res, req.user);
                if (req.method === 'DELETE' && path === '/api/parts/delete') return await partHandlers.deletePart(req, res, req.user);

                // Chat
                const chatHistoryMatch = path.match(/^\/api\/chat\/history\/([a-zA-Z0-9]+)$/);
                if (req.method === 'GET' && chatHistoryMatch) {
                     req.params = { layoutId: chatHistoryMatch[1] };
                     return await chatHandlers.getConversationHistory(req, res, req.params.layoutId, req.user);
                }
                if (req.method === 'POST' && path === '/api/chat/post') return await chatHandlers.postMessage(req, res, req.user);

                // Level History (Protected?)
                const levelHistoryMatch = path.match(/^\/api\/levels\/([a-zA-Z0-9]+)\/history$/);
                if (req.method === 'GET' && levelHistoryMatch) {
                    req.params = { levelId: levelHistoryMatch[1] };
                    return await listManagementHandlers.getLevelHistory(req, res, req.params.levelId);
                }

                // --- Admin/Moderator Routes ---
                if (path.startsWith('/api/admin/')) {
                    isModeratorOrAdmin(req, res, async () => { // Apply Mod/Admin check
                        console.log(`[API Router] Admin route check passed for ${req.method} ${path}. Routing...`);
                        
                        // [NEW] Add the new route for adding a record
                        if (req.method === 'POST' && path === '/api/admin/add-record') {
                            return await listManagementHandlers.addRecordToList(req, res);
                        }
                        
                        if (req.method === 'POST' && path === '/api/admin/add-level') return await listManagementHandlers.addLevelToList(req, res);
                        if (req.method === 'PUT' && path === '/api/admin/move-level') return await listManagementHandlers.moveLevelInList(req, res);
                        if (req.method === 'DELETE' && path === '/api/admin/remove-level') return await listManagementHandlers.removeLevelFromList(req, res);
                        if (req.method === 'PUT' && path === '/api/admin/update-level') return await listManagementHandlers.updateLevel(req, res);
                        if (req.method === 'GET' && path === '/api/admin/submissions') return await moderationHandlers.listSubmissions(req, res);
                        if (req.method === 'POST' && path === '/api/admin/update-submission') return await moderationHandlers.updateSubmissionStatus(req, res);
                        if (req.method === 'GET' && path === '/api/admin/layout-reports') return await moderationHandlers.listLayoutReports(req, res);
                        if (req.method === 'PUT' && path === '/api/admin/layout-reports') return await moderationHandlers.updateReportStatus(req, res);
                        if (req.method === 'DELETE' && path === '/api/admin/layouts') return await layoutHandlers.deleteLayoutByAdmin(req, res);
                        if (req.method === 'PUT' && path === '/api/admin/users/ban') return await moderationHandlers.banUserFromWorkshop(req, res);

                        // If no admin route matched inside this block
                        console.log(`[API Router] Admin route not matched: ${req.method} ${path}`);
                        res.status(404).json({ message: 'Admin route not found.' });
                    });
                     return; // Prevent fallthrough after calling async middleware
                }

                 // If no specific protected route matched after authentication
                console.log(`[API Router] Authenticated route not found: ${req.method} ${path}`);
                res.status(404).json({ message: 'API endpoint not found.' });

            }); // End authenticateToken callback

        } catch (error) {
            console.error("[API Router] Unhandled error during routing:", error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Internal Server Error' });
            }
        }
    }); // End CORS middleware callback
}