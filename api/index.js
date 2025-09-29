import { verifyToken } from '../src/server/authUtils.js';
import * as authHandlers from '../src/server/authHandlers.js';
import * as friendHandlers from '../src/server/friendHandlers.js';
import * as layoutHandlers from '../src/server/layoutHandlers.js';
import * as userHandlers from '../src/server/userHandlers.js';
import * as accountHandlers from '../src/server/accountHandlers.js';
import * as personalRecordHandlers from '../src/server/personalRecordHandlers.js'; // We'll migrate this next

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

  // --- AUTHENTICATED ROUTES ---
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

  // If no route in this file matches, Vercel will try to find another file that matches the path.
  // We will add a final 404 response here after all migrations are done.
  res.status(404).json({ message: `Route ${req.method} ${path} not found in main router.` });
}