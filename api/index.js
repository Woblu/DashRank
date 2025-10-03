import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
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

const prisma = new PrismaClient();

// Helper to get decoded token
const getDecodedToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch (error) { return null; }
};

// Main handler function
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  
  // Manual body parser for POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    try {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      if (chunks.length > 0) { req.body = JSON.parse(Buffer.concat(chunks).toString()); }
    } catch (e) { /* Ignore */ }
  }

  // --- PUBLIC ROUTES ---
  if (path === '/api/auth' && req.method === 'POST') {
    const { action } = req.body;
    if (action === 'login') return authHandlers.loginUser(req, res);
    if (action === 'register') return authHandlers.registerUser(req, res);
  }
  const levelMatch = path.match(/^\/api\/level\/(\d+)$/);
  if (levelMatch && req.method === 'GET') {
    const levelId = parseInt(levelMatch[1], 10);
    const level = await prisma.level.findFirst({ where: { levelId } });
    return level ? res.status(200).json(level) : res.status(404).json({ error: 'Level not found' });
  }
  const listMatch = path.match(/^\/api\/lists\/([a-zA-Z0-9_-]+)$/);
  if (listMatch && req.method === 'GET') {
    const listType = listMatch[1];
    const levels = await prisma.level.findMany({ where: { list: listType }, orderBy: { placement: 'asc' } });
    return res.status(200).json(levels);
  }
  if (path === '/api/layouts' && req.method === 'GET') {
    return layoutHandlers.listLayouts(req, res);
  }
  const layoutDetailMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)$/);
  if (layoutDetailMatch && req.method === 'GET') {
    const layoutId = layoutDetailMatch[1];
    return layoutHandlers.getLayoutById(req, res, layoutId);
  }

  // --- AUTH BARRIER ---
  const decodedToken = getDecodedToken(req);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // --- PROTECTED ROUTES ---
 // Admin Routes
  if (path.startsWith('/api/admin/')) {
    if (decodedToken.role !== 'ADMIN' && decodedToken.role !== 'MODERATOR') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }
    if (path === '/api/admin/layout-reports' && req.method === 'GET') return moderationHandlers.listLayoutReports(req, res);
    if (path === '/api/admin/layout-reports' && req.method === 'PUT') return moderationHandlers.updateReportStatus(req, res);
    if (path === '/api/admin/layouts' && req.method === 'DELETE') return layoutHandlers.deleteLayoutByAdmin(req, res);
    if (path === '/api/admin/users/ban' && req.method === 'PUT') return moderationHandlers.banUserFromWorkshop(req, res);
    // NEW ADMIN LIST ROUTES
    if (path === '/api/admin/add-level' && req.method === 'POST') return listManagementHandlers.addLevelToList(req, res, decodedToken);
    if (path === '/api/admin/move-level' && req.method === 'PUT') return listManagementHandlers.moveLevelInList(req, res, decodedToken);
    if (path === '/api/admin/remove-level' && req.method === 'DELETE') return listManagementHandlers.removeLevelFromList(req, res, decodedToken);
  }
  if (path === '/api/friends') {
    if (req.method === 'GET') return friendHandlers.listFriends(req, res, decodedToken);
    if (req.method === 'POST') return friendHandlers.sendFriendRequest(req, res, decodedToken);
    if (req.method === 'PUT') return friendHandlers.respondToFriendRequest(req, res, decodedToken);
  }
  if (path === '/api/layouts' && req.method === 'POST') {
    return layoutHandlers.createLayout(req, res, decodedToken);
  }
  const layoutSubRouteMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)\/(applicants|parts-and-team)$/);
  if (layoutSubRouteMatch && req.method === 'GET') {
    const [, layoutId, subRoute] = layoutSubRouteMatch;
    if (subRoute === 'applicants') return collaborationHandlers.listLayoutApplicants(req, res, layoutId);
    if (subRoute === 'parts-and-team') return partHandlers.getLayoutPartsAndTeam(req, res, layoutId);
  }
  if (path === '/api/collaboration-requests' && req.method === 'POST') return collaborationHandlers.applyToLayout(req, res, decodedToken);
  if (path === '/api/collaboration-requests/update' && req.method === 'PUT') return collaborationHandlers.updateApplicationStatus(req, res, decodedToken);
  if (path === '/api/parts/create' && req.method === 'POST') return partHandlers.createPart(req, res, decodedToken);
  if (path === '/api/parts/assign' && req.method === 'PUT') return partHandlers.assignPart(req, res, decodedToken);
  if (path === '/api/parts/status' && req.method === 'PUT') return partHandlers.updatePartStatus(req, res, decodedToken);
  if (path === '/api/parts/delete' && req.method === 'DELETE') return partHandlers.deletePart(req, res, decodedToken);
  const chatHistoryMatch = path.match(/^\/api\/chat\/history\/(.+)$/);
  if (chatHistoryMatch && req.method === 'GET') {
      return chatHandlers.getConversationHistory(req, res, chatHistoryMatch[1], decodedToken);
  }
  if (path === '/api/chat/post' && req.method === 'POST') return chatHandlers.postMessage(req, res, decodedToken);

  // Fallback 404
  return res.status(404).json({ message: `Route ${req.method} ${path} not found.` });
}