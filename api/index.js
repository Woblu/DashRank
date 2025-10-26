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
        // Check if it's a route that *might* be okay without a token (e.g., public profile GET?)
        // For simplicity now, enforce token for all routes after this middleware is applied.
        return res.status(401).json({ message: 'Unauthorized: Token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("[AuthMiddleware] JWT Verification Error:", err.message);
            return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
        }
        req.user = user;
        console.log("[AuthMiddleware] Token verified for user:", user.userId);
        next();
    });
};

const isModeratorOrAdmin = (req, res, next) => {
     if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR')) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Requires Moderator or Admin role' });
    }
};
// Add isAdmin if needed

// --- Vercel Serverless Function Handler ---
export default async function handler(req, res) {
    // Apply CORS globally (can be more specific if needed)
    cors()(req, res, async () => {
        // Parse JSON body for POST/PUT/DELETE
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            try {
                // Simple body parser for Vercel's Node runtime
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

        console.log(`[API Router] Request: ${req.method} ${path}`);

        try {
            // --- PUBLIC ROUTES (Checked FIRST) ---
            if (req.method === 'POST' && path === '/api/auth/login') {
                return await authHandlers.loginUser(req, res);
            }
            if (req.method === 'POST' && path === '/api/register') {
                return await authHandlers.registerUser(req, res);
            }
            if (req.method === 'GET' && path.startsWith('/api/lists/') && !path.includes('history')) {
                req.params = { listName: path.split('/')[3] }; // Extract listName
                return await prisma.level.findMany({ // Handle directly for simplicity
                    where: { list: req.params.listName }, orderBy: { placement: 'asc' }
                }).then(levels => res.status(200).json(levels))
                  .catch(error => { console.error(`Error fetching list ${req.params.listName}:`, error); res.status(500).json({ message: "Failed."}); });
            }
            if (req.method === 'GET' && path.startsWith('/api/level/')) {
                 req.params = { levelId: path.split('/')[3] }; // Extract levelId/slug
                 const { levelId } = req.params;
                 const { list } = req.query;
                 const gdLevelId = parseInt(levelId, 10);
                 let level = null;
                 if (!isNaN(gdLevelId)) { level = await prisma.level.findFirst({ where: { levelId: gdLevelId, ...(list && { list: list }) } }); }
                 if (!level && /^[a-f\d]{24}$/i.test(levelId)) { level = await prisma.level.findFirst({ where: { id: levelId, ...(list && { list: list }) } }); }
                 if (level) { return res.status(200).json(level); }
                 else { return res.status(404).json({ message: 'Level not found' }); }
            }
             if (req.method === 'GET' && path === '/api/lists/main-list/history') {
                return await listManagementHandlers.getHistoricList(req, res);
            }
             if (req.method === 'GET' && path === '/api/layouts') {
                return await layoutHandlers.listLayouts(req, res);
            }
             if (req.method === 'GET' && path.startsWith('/api/layouts/') && !path.includes('/applicants') && !path.includes('/parts-and-team')) {
                 req.params = { layoutId: path.split('/')[3] };
                 return await layoutHandlers.getLayoutById(req, res, req.params.layoutId);
            }
            if (req.method === 'GET' && path.startsWith('/api/player-stats/')) {
                req.params = { playerName: path.split('/')[3] }; // Extract playerName
                return await getPlayerStats(req, res); // Call the handler
            }


            // --- If not a public route, apply Authentication ---
            authenticateToken(req, res, async () => {
                // --- PROTECTED ROUTES ---
                if (req.method === 'GET' && path === '/api/users') return await userHandlers.getUser(req, res, req.user);
                if (req.method === 'POST' && path === '/api/users') return await userHandlers.pinRecord(req, res, req.user);

                if (req.method === 'POST' && path === '/api/layout-reports') return await moderationHandlers.createLayoutReport(req, res, req.user);

                if (path === '/api/personal-records') {
                    if (req.method === 'GET') return await personalRecordHandlers.listPersonalRecords(req, res, req.user);
                    if (req.method === 'POST') return await personalRecordHandlers.createPersonalRecord(req, res, req.user);
                    if (req.method === 'DELETE') return await personalRecordHandlers.deletePersonalRecord(req, res, req.user);
                }
                if (path.startsWith('/api/personal-records/')) {
                    req.params = { recordId: path.split('/')[3] };
                    if (req.method === 'GET') return await personalRecordHandlers.getPersonalRecordById(req, res, req.user, req.params.recordId);
                    if (req.method === 'PUT') return await personalRecordHandlers.updatePersonalRecord(req, res, req.user, req.params.recordId);
                }

                if (path === '/api/friends') {
                    if (req.method === 'GET') return await friendHandlers.listFriends(req, res, req.user);
                    if (req.method === 'POST') return await friendHandlers.sendFriendRequest(req, res, req.user);
                    if (req.method === 'PUT') return await friendHandlers.respondToFriendRequest(req, res, req.user);
                }

                if (req.method === 'POST' && path === '/api/layouts') return await layoutHandlers.createLayout(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/account') return await accountHandlers.updateAccount(req, res, req.user);

                if (path.startsWith('/api/layouts/') && path.includes('/applicants')) {
                     req.params = { layoutId: path.split('/')[3] };
                     if (req.method === 'GET') return await collaborationHandlers.listLayoutApplicants(req, res, req.params.layoutId);
                }
                if (path.startsWith('/api/layouts/') && path.includes('/parts-and-team')) {
                     req.params = { layoutId: path.split('/')[3] };
                     if (req.method === 'GET') return await partHandlers.getLayoutPartsAndTeam(req, res, req.params.layoutId);
                }

                if (req.method === 'POST' && path === '/api/collaboration-requests') return await collaborationHandlers.applyToLayout(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/collaboration-requests/update') return await collaborationHandlers.updateApplicationStatus(req, res, req.user);

                if (req.method === 'POST' && path === '/api/parts/create') return await partHandlers.createPart(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/parts/assign') return await partHandlers.assignPart(req, res, req.user);
                if (req.method === 'PUT' && path === '/api/parts/status') return await partHandlers.updatePartStatus(req, res, req.user);
                if (req.method === 'DELETE' && path === '/api/parts/delete') return await partHandlers.deletePart(req, res, req.user);

                if (req.method === 'GET' && path.startsWith('/api/chat/history/')) {
                     req.params = { layoutId: path.split('/')[4] };
                     return await chatHandlers.getConversationHistory(req, res, req.params.layoutId, req.user);
                }
                if (req.method === 'POST' && path === '/api/chat/post') return await chatHandlers.postMessage(req, res, req.user);

                if (req.method === 'GET' && path.startsWith('/api/levels/') && path.endsWith('/history')) {
                     req.params = { levelId: path.split('/')[3] };
                     return await listManagementHandlers.getLevelHistory(req, res, req.params.levelId);
                }

                // --- Admin/Moderator Routes ---
                if (path.startsWith('/api/admin/')) {
                    // Apply Mod/Admin check *within* this block
                    isModeratorOrAdmin(req, res, async () => {
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

                        // If no admin route matched
                        console.log(`[API Router] Admin route not matched: ${req.method} ${path}`);
                        res.status(404).json({ message: 'Admin route not found.' });
                    });
                } else {
                    // If no protected route matched
                     console.log(`[API Router] Protected route not matched: ${req.method} ${path}`);
                     res.status(404).json({ message: 'Protected route not found.' });
                }

            }); // End authenticateToken callback

        } catch (error) {
            console.error("[API Router] Unhandled error in router:", error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Internal Server Error' });
            }
        }
    }); // End CORS middleware callback
}