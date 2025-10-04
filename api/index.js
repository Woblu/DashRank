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

const getDecodedToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch (error) { return null; }
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);

  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    try {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      if (chunks.length > 0) { req.body = JSON.parse(Buffer.concat(chunks).toString()); }
    } catch (e) { /* Ignore */ }
  }

  // --- PUBLIC ROUTES ---
  if ((path === '/api/auth' || path === '/api/register') && req.method === 'POST') {
    const { action } = req.body || {};
    if (path === '/api/auth' && action === 'login') return authHandlers.loginUser(req, res);
    if (path === '/api/register' || (path === '/api/auth' && action === 'register')) return authHandlers.registerUser(req, res);
  } 
  else if (path.match(/^\/api\/level\/\d+$/) && req.method === 'GET') {
    const levelId = parseInt(path.split('/')[3], 10);
    const level = await prisma.level.findFirst({ where: { levelId } });
    return level ? res.status(200).json(level) : res.status(404).json({ error: 'Level not found' });
  } 
  else if (path.match(/^\/api\/lists\/[a-zA-Z0-9_-]+$/) && req.method === 'GET') {
    const listType = path.split('/')[3];
    const levels = await prisma.level.findMany({ where: { list: listType }, orderBy: { placement: 'asc' } });
    return res.status(200).json(levels);
  }
  else if (path === '/api/lists/main-list/history' && req.method === 'GET') {
    return listManagementHandlers.getHistoricList(req, res);
  }
  else if (path === '/api/layouts' && req.method === 'GET') {
    return layoutHandlers.listLayouts(req, res);
  } 
  else if (path.match(/^\/api\/layouts\/[a-zA-Z0-9]+$/) && !path.includes('/applicants') && !path.includes('/parts-and-team') && req.method === 'GET') {
    const layoutId = path.split('/')[3];
    return layoutHandlers.getLayoutById(req, res, layoutId);
  } 
  // --- START OF PROTECTED ROUTES ---
  else {
    const decodedToken = getDecodedToken(req);
    if (!decodedToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
   
    if (path === '/api/users') {
      if (req.method === 'GET') return userHandlers.getUser(req, res, decodedToken);
      if (req.method === 'POST') return userHandlers.pinRecord(req, res, decodedToken);
    } 
    else if (path === '/api/layout-reports' && req.method === 'POST') {
      return moderationHandlers.createLayoutReport(req, res, decodedToken);
    } 
    else if (path === '/api/personal-records') {
      if (req.method === 'GET') return personalRecordHandlers.listPersonalRecords(req, res, decodedToken);
      if (req.method === 'POST') return personalRecordHandlers.createPersonalRecord(req, res, decodedToken);
      if (req.method === 'DELETE') return personalRecordHandlers.deletePersonalRecord(req, res, decodedToken);
    }
    else if (path.match(/^\/api\/personal-records\/[a-zA-Z0-9]+$/)) {
        const recordId = path.split('/')[3];
        if (req.method === 'GET') return personalRecordHandlers.getPersonalRecordById(req, res, decodedToken, recordId);
        if (req.method === 'PUT') return personalRecordHandlers.updatePersonalRecord(req, res, decodedToken, recordId);
    }
    else if (path === '/api/friends') {
      if (req.method === 'GET') return friendHandlers.listFriends(req, res, decodedToken);
      if (req.method === 'POST') return friendHandlers.sendFriendRequest(req, res, decodedToken);
      if (req.method === 'PUT') return friendHandlers.respondToFriendRequest(req, res, decodedToken);
    } 
    else if (path === '/api/layouts' && req.method === 'POST') {
      return layoutHandlers.createLayout(req, res, decodedToken);
    } 
    else if (path === '/api/account' && req.method === 'PUT') {
        return accountHandlers.updateAccount(req, res, decodedToken);
    }
    else if (path.match(/^\/api\/layouts\/[a-zA-Z0-9]+\/(applicants|parts-and-team)$/) && req.method === 'GET') {
      const [, , , layoutId, subRoute] = path.split('/');
      if (subRoute === 'applicants') return collaborationHandlers.listLayoutApplicants(req, res, layoutId);
      if (subRoute === 'parts-and-team') return partHandlers.getLayoutPartsAndTeam(req, res, layoutId);
    } 
    else if (path === '/api/collaboration-requests' && req.method === 'POST') {
      return collaborationHandlers.applyToLayout(req, res, decodedToken);
    } 
    else if (path === '/api/collaboration-requests/update' && req.method === 'PUT') {
      return collaborationHandlers.updateApplicationStatus(req, res, decodedToken);
    } 
    else if (path === '/api/parts/create' && req.method === 'POST') {
      return partHandlers.createPart(req, res, decodedToken);
    } 
    else if (path === '/api/parts/assign' && req.method === 'PUT') {
      return partHandlers.assignPart(req, res, decodedToken);
    } 
    else if (path === '/api/parts/status' && req.method === 'PUT') {
      return partHandlers.updatePartStatus(req, res, decodedToken);
    } 
    else if (path === '/api/parts/delete' && req.method === 'DELETE') {
      return partHandlers.deletePart(req, res, decodedToken);
    } 
    else if (path.match(/^\/api\/chat\/history\/.+$/) && req.method === 'GET') {
      const layoutId = path.split('/')[4];
      return chatHandlers.getConversationHistory(req, res, layoutId, decodedToken);
    } 
    else if (path === '/api/chat/post' && req.method === 'POST') {
      return chatHandlers.postMessage(req, res, decodedToken);
    }
    else if (path.match(/^\/api\/levels\/[a-zA-Z0-9]+\/history$/) && req.method === 'GET') {
        const levelId = path.split('/')[3];
        return listManagementHandlers.getLevelHistory(req, res, levelId);
    }
    else if (path.startsWith('/api/admin/')) {
      if (!['ADMIN', 'MODERATOR'].includes(decodedToken.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (path === '/api/admin/add-level' && req.method === 'POST') return listManagementHandlers.addLevelToList(req, res);
      if (path === '/api/admin/move-level' && req.method === 'PUT') return listManagementHandlers.moveLevelInList(req, res);
      if (path === '/api/admin/remove-level' && req.method === 'DELETE') return listManagementHandlers.removeLevelFromList(req, res);
      if (path === '/api/admin/submissions' && req.method === 'GET') return moderationHandlers.listSubmissions(req, res);
      if (path === '/api/admin/update-submission' && req.method === 'POST') return moderationHandlers.updateSubmissionStatus(req, res);
      if (path === '/api/admin/layout-reports' && req.method === 'GET') return moderationHandlers.listLayoutReports(req, res);
      if (path === '/api/admin/layout-reports' && req.method === 'PUT') return moderationHandlers.updateReportStatus(req, res);
      if (path === '/api/admin/layouts' && req.method === 'DELETE') return layoutHandlers.deleteLayoutByAdmin(req, res);
      if (path === '/api/admin/users/ban' && req.method === 'PUT') return moderationHandlers.banUserFromWorkshop(req, res);
    } 
    else {
      return res.status(404).json({ message: `Route ${req.method} ${path} not found.` });
    }
  }
}