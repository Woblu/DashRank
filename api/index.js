import { verifyToken } from '../src/server/authUtils.js';
import * as authHandlers from '../src/server/authHandlers.js';
import * as friendHandlers from '../src/server/friendHandlers.js';
import * as layoutHandlers from '../src/server/layoutHandlers.js';
import * as userHandlers from '../src/server/userHandlers.js';
import * as accountHandlers from '../src/server/accountHandlers.js';
import * as personalRecordHandlers from '../src/server/personalRecordHandlers.js';
import * as moderationHandlers from '../src/server/moderationHandlers.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  // --- PUBLIC ROUTES (No login required) ---
  if (path === '/api/auth' && req.method === 'POST') {
    const { action } = req.body;
    if (action === 'login') return authHandlers.loginUser(req, res);
    if (action === 'register') return authHandlers.registerUser(req, res);
  }
  
  if (req.method === 'GET' && path.startsWith('/api/layouts/')) {
    const layoutId = path.split('/')[3];
    if (layoutId) return layoutHandlers.getLayoutById(req, res, layoutId);
  }
  
  if (path === '/api/layouts' && req.method === 'GET') {
    return layoutHandlers.listLayouts(req, res);
  }

  // --- AUTHENTICATION BARRIER ---
  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // --- AUTHENTICATED & PROTECTED ROUTES ---
  
  // Admin Routes
  if (path === '/api/admin/layout-reports') {
    if (decodedToken.role !== 'ADMIN' && decodedToken.role !== 'MODERATOR') {
      return res.status(403).json({ message: 'Forbidden: Access is limited to administrators.' });
    }
    if (req.method === 'GET') return moderationHandlers.listLayoutReports(req, res);
    if (req.method === 'PUT') return moderationHandlers.updateReportStatus(req, res);
  }
  
  if (path === '/api/admin/layouts' && req.method === 'DELETE') {
    if (decodedToken.role !== 'ADMIN' && decodedToken.role !== 'MODERATOR') {
      return res.status(403).json({ message: 'Forbidden: Access is limited to administrators.' });
    }
    return layoutHandlers.deleteLayoutByAdmin(req, res);
  }

  if (path === '/api/admin/users/ban' && req.method === 'PUT') {
    if (decodedToken.role !== 'ADMIN' && decodedToken.role !== 'MODERATOR') {
      return res.status(403).json({ message: 'Forbidden: Access is limited to administrators.' });
    }
    return moderationHandlers.banUserFromWorkshop(req, res);
  }

  // Moderation Route (user-facing)
  if (path === '/api/layout-reports' && req.method === 'POST') {
    return moderationHandlers.createLayoutReport(req, res, decodedToken);
  }
  
  // Friend Routes
  if (path === '/api/friends') {
    if (req.method === 'GET') return friendHandlers.listFriends(req, res, decodedToken);
    if (req.method === 'POST') return friendHandlers.sendFriendRequest(req, res, decodedToken);
    if (req.method === 'PUT') return friendHandlers.respondToFriendRequest(req, res, decodedToken);
  }
  // User Routes
  if (path === '/api/users') {
      if (req.method === 'GET') return userHandlers.getUser(req, res, decodedToken);
      if (req.method === 'POST') return userHandlers.pinRecord(req, res, decodedToken);
  }
  // Layout Creation
  if (path === '/api/layouts' && req.method === 'POST') {
    return layoutHandlers.createLayout(req, res, decodedToken);
  }
  // Account Management
  if (path === '/api/account' && req.method === 'PUT') {
      return accountHandlers.updateAccount(req, res, decodedToken);
  }
  // Personal Record Routes
  if (path === '/api/personal-records' && req.method === 'GET') {
    return personalRecordHandlers.listPersonalRecords(req, res, decodedToken);
  }
  if (path === '/api/personal-records' && req.method === 'POST') {
    return personalRecordHandlers.createPersonalRecord(req, res, decodedToken);
  }
  if (path === '/api/personal-records' && req.method === 'DELETE') {
    return personalRecordHandlers.deletePersonalRecord(req, res, decodedToken);
  }
  if (path.startsWith('/api/personal-records/') && req.method === 'GET') {
    const recordId = path.split('/')[3];
    return personalRecordHandlers.getPersonalRecordById(req, res, decodedToken, recordId);
  }
  if (path.startsWith('/api/personal-records/') && req.method === 'PUT') {
    const recordId = path.split('/')[3];
    return personalRecordHandlers.updatePersonalRecord(req, res, decodedToken, recordId);
  }

  // If no route matches, return 404
  res.status(404).json({ message: `Route ${req.method} ${path} not found.` });
}