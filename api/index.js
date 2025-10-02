import { verifyToken } from '../src/server/authUtils.js';
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
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  
  // Vercel's body parser might not have run yet, so we'll parse it manually if needed.
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    try {
      const bodyChunks = [];
      for await (const chunk of req) {
        bodyChunks.push(chunk);
      }
      if (bodyChunks.length > 0) {
        req.body = JSON.parse(Buffer.concat(bodyChunks).toString());
      }
    } catch (e) {
      // Ignore errors if body is not JSON or empty
    }
  }

  // --- PUBLIC ROUTES ---
  if (path === '/api/auth' && req.method === 'POST') {
    const { action } = req.body;
    if (action === 'login') return authHandlers.loginUser(req, res);
    if (action === 'register') return authHandlers.registerUser(req, res);
  }
  if (req.method === 'GET' && path.startsWith('/api/layouts/')) {
    const pathParts = path.split('/');
    if (pathParts.length === 4 && !path.endsWith('/applicants') && !path.endsWith('/parts-and-team')) {
        const layoutId = pathParts[3];
        return layoutHandlers.getLayoutById(req, res, layoutId);
    }
  }
  if (path === '/api/layouts' && req.method === 'GET') {
    return layoutHandlers.listLayouts(req, res);
  }

  // --- AUTH BARRIER ---
  const decodedToken = verifyToken(req.headers.authorization);
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

  // Collaboration & Parts & Chat Routes
  if (path === '/api/collaboration-requests' && req.method === 'POST') return collaborationHandlers.applyToLayout(req, res, decodedToken);
  if (path === '/api/collaboration-requests/update' && req.method === 'PUT') return collaborationHandlers.updateApplicationStatus(req, res, decodedToken);
  const layoutSubRouteMatch = path.match(/^\/api\/layouts\/([a-zA-Z0-9]+)\/(applicants|parts-and-team)$/);
  if (layoutSubRouteMatch && req.method === 'GET') {
    const [, layoutId, subRoute] = layoutSubRouteMatch;
    if (subRoute === 'applicants') return collaborationHandlers.listLayoutApplicants(req, res, layoutId);
    if (subRoute === 'parts-and-team') return partHandlers.getLayoutPartsAndTeam(req, res, layoutId);
  }
  if (path === '/api/parts/create' && req.method === 'POST') return partHandlers.createPart(req, res, decodedToken);
  if (path === '/api/parts/assign' && req.method === 'PUT') return partHandlers.assignPart(req, res, decodedToken);
  if (path === '/api/parts/status' && req.method === 'PUT') return partHandlers.updatePartStatus(req, res, decodedToken);
  if (path === '/api/parts/delete' && req.method === 'DELETE') return partHandlers.deletePart(req, res, decodedToken);
  const chatHistoryMatch = path.match(/^\/api\/chat\/history\/(.+)$/);
  if (chatHistoryMatch && req.method === 'GET') {
    const layoutId = chatHistoryMatch[1];
    return chatHandlers.getConversationHistory(req, res, layoutId, decodedToken);
  }
  if (path === '/api/chat/post' && req.method === 'POST') return chatHandlers.postMessage(req, res, decodedToken);

  // Other User Routes
  if (path === '/api/layout-reports' && req.method === 'POST') return moderationHandlers.createLayoutReport(req, res, decodedToken);
  if (path === '/api/friends') {
    if (req.method === 'GET') return friendHandlers.listFriends(req, res, decodedToken);
    if (req.method === 'POST') return friendHandlers.sendFriendRequest(req, res, decodedToken);
    if (req.method === 'PUT') return friendHandlers.respondToFriendRequest(req, res, decodedToken);
  }
  if (path === '/api/users') {
      if (req.method === 'GET') return userHandlers.getUser(req, res, decodedToken);
      if (req.method === 'POST') return userHandlers.pinRecord(req, res, decodedToken);
  }
  if (path === '/api/layouts' && req.method === 'POST') return layoutHandlers.createLayout(req, res, decodedToken);
  if (path === '/api/account' && req.method === 'PUT') return accountHandlers.updateAccount(req, res, decodedToken);
  if (path === '/api/personal-records') {
    if(req.method === 'GET') return personalRecordHandlers.listPersonalRecords(req, res, decodedToken);
    if(req.method === 'POST') return personalRecordHandlers.createPersonalRecord(req, res, decodedToken);
    if(req.method === 'DELETE') return personalRecordHandlers.deletePersonalRecord(req, res, decodedToken);
  }
  const prMatch = path.match(/^\/api\/personal-records\/([a-zA-Z0-9]+)$/);
  if (prMatch) {
    const recordId = prMatch[1];
    if(req.method === 'GET') return personalRecordHandlers.getPersonalRecordById(req, res, decodedToken, recordId);
    if(req.method === 'PUT') return personalRecordHandlers.updatePersonalRecord(req, res, decodedToken, recordId);
  }

  // Fallback 404
  res.status(404).json({ message: `Route ${req.method} ${path} not found.` });
}