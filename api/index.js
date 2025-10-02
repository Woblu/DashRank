import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to get decoded token, returns null if invalid/missing
const getDecodedToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  
  // Manual body parser for POST/PUT/DELETE methods
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    try {
      const chunks = [];
      for await (const chunk of req) { chunks.push(chunk); }
      if (chunks.length > 0) {
        req.body = JSON.parse(Buffer.concat(chunks).toString());
      }
    } catch (e) { /* Ignore non-JSON or empty body */ }
  }

  // --- PUBLIC ROUTES (No Auth Required) ---

  // GET /api/level/[levelId]
  const levelMatch = path.match(/^\/api\/level\/(\d+)$/);
  if (levelMatch && req.method === 'GET') {
    const levelId = parseInt(levelMatch[1], 10);
    try {
      const level = await prisma.level.findFirst({ where: { levelId } });
      return level ? res.status(200).json(level) : res.status(404).json({ error: 'Level not found' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch level data.' });
    }
  }

  // GET /api/lists/[listType]
  const listMatch = path.match(/^\/api\/lists\/([a-zA-Z0-9_-]+)$/);
  if (listMatch && req.method === 'GET') {
    const listType = listMatch[1];
    try {
      const levels = await prisma.level.findMany({
        where: { list: listType },
        orderBy: { placement: 'asc' },
      });
      return res.status(200).json(levels);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch level list.' });
    }
  }

  // Your existing public routes (e.g., login/register) would go here
  
  // --- AUTHENTICATION BARRIER ---
  
  const decodedToken = getDecodedToken(req);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // --- PROTECTED ROUTES (Auth Required) ---

  // POST /api/submissions/create
  if (path === '/api/submissions/create' && req.method === 'POST') {
    const { levelName, player, percent, videoId, rawFootageLink, notes } = req.body;
    if (!levelName || !player || !percent || !videoId || !rawFootageLink) {
      return res.status(400).json({ message: 'Please fill out all required fields.' });
    }
    try {
      await prisma.submission.create({
        data: { levelName, player, percent: Number(percent), videoId, rawFootageLink, notes: notes || null, submittedById: decodedToken.userId },
      });
      return res.status(201).json({ message: 'Submission received!' });
    } catch (error) {
      console.error('Submission Error:', error);
      return res.status(500).json({ message: 'An error occurred while saving the submission.' });
    }
  }

  // GET, POST, DELETE /api/personal-records
  if (path === '/api/personal-records' && ['GET', 'POST', 'DELETE'].includes(req.method)) {
    switch (req.method) {
      case 'GET':
        const records = await prisma.personalRecord.findMany({ where: { userId: decodedToken.userId }, orderBy: { placement: 'asc' } });
        return res.status(200).json(records);
      
      case 'POST':
        const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;
        if (!placement || !levelName || !difficulty || !videoUrl) {
          return res.status(400).json({ message: 'Placement, level name, difficulty, and video URL are required.' });
        }
        await prisma.$transaction([
          prisma.personalRecord.updateMany({ where: { userId: decodedToken.userId, placement: { gte: Number(placement) } }, data: { placement: { increment: 1 } } }),
          prisma.personalRecord.create({ data: { placement: Number(placement), levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, thumbnailUrl, userId: decodedToken.userId } }),
        ]);
        return res.status(201).json({ message: 'Record added successfully.' });

      case 'DELETE':
        const { recordId } = req.body;
        if (!recordId) return res.status(400).json({ message: 'Record ID is required.' });
        const recordToDelete = await prisma.personalRecord.findFirst({ where: { id: recordId, userId: decodedToken.userId } });
        if (!recordToDelete) return res.status(403).json({ message: 'Record not found or you do not have permission to delete it.' });
        await prisma.$transaction([
          prisma.personalRecord.delete({ where: { id: recordId } }),
          prisma.personalRecord.updateMany({ where: { userId: decodedToken.userId, placement: { gt: recordToDelete.placement } }, data: { placement: { decrement: 1 } } }),
        ]);
        return res.status(200).json({ message: 'Record deleted successfully.' });
    }
  }
  
  // GET, PUT /api/personal-records/[recordId]
  const prMatch = path.match(/^\/api\/personal-records\/([a-zA-Z0-9]+)$/);
  if (prMatch) {
    const recordId = prMatch[1];
    const viewerId = decodedToken.userId;

    if (req.method === 'GET') {
      const record = await prisma.personalRecord.findUnique({ where: { id: recordId } });
      if (!record) return res.status(404).json({ message: 'Record not found.' });
      const isOwner = record.userId === viewerId;
      const friendship = await prisma.friendship.findFirst({ where: { status: 'ACCEPTED', OR: [{ requesterId: viewerId, receiverId: record.userId }, { requesterId: record.userId, receiverId: viewerId }] } });
      if (!isOwner && !friendship) return res.status(403).json({ message: 'You do not have permission to view this record.' });
      return res.status(200).json(record);
    }
    
    if (req.method === 'PUT') {
        const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;
        if (!placement || !levelName || !difficulty || !videoUrl) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }
        const newPlacement = Number(placement);

        await prisma.$transaction(async (tx) => {
            const originalRecord = await tx.personalRecord.findFirst({ where: { id: recordId, userId: viewerId } });
            if (!originalRecord) throw new Error('Record not found');

            const oldPlacement = originalRecord.placement;
            if (oldPlacement === newPlacement) {
                await tx.personalRecord.update({ where: { id: recordId }, data: { levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, thumbnailUrl } });
                return;
            }

            if (oldPlacement > newPlacement) {
                await tx.personalRecord.updateMany({ where: { userId: viewerId, placement: { gte: newPlacement, lt: oldPlacement } }, data: { placement: { increment: 1 } } });
            } else {
                await tx.personalRecord.updateMany({ where: { userId: viewerId, placement: { gt: oldPlacement, lte: newPlacement } }, data: { placement: { decrement: 1 } } });
            }

            await tx.personalRecord.update({ where: { id: recordId }, data: { placement: newPlacement, levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, thumbnailUrl } });
        });
        return res.status(200).json({ message: 'Record updated successfully.' });
    }
  }

  // --- ADMIN & MODERATOR ROUTES ---
  if (path.startsWith('/api/admin/')) {
    if (!['ADMIN', 'MODERATOR'].includes(decodedToken.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (path === '/api/admin/submissions' && req.method === 'GET') {
      const { status = 'PENDING' } = req.query;
      const submissions = await prisma.submission.findMany({ where: { status: status.toUpperCase() }, orderBy: { createdAt: 'asc' } });
      return res.status(200).json(submissions);
    }
    
    if (path === '/api/admin/update-submission' && req.method === 'POST') {
      const { submissionId, newStatus } = req.body;
      if (!submissionId || !['APPROVED', 'REJECTED'].includes(newStatus)) return res.status(400).json({ message: 'Invalid request body.' });
      const submission = await prisma.submission.update({ where: { id: submissionId }, data: { status: newStatus } });
      if (newStatus === 'APPROVED') {
        await prisma.level.updateMany({
          where: { name: submission.levelName },
          data: { records: { push: { username: submission.player, percent: submission.percent, videoId: submission.videoId } } },
        });
      }
      return res.status(200).json({ message: `Submission status updated to ${newStatus}` });
    }
    
    if (path === '/api/admin/remove-record' && req.method === 'POST') {
      const { levelId, recordVideoId } = req.body;
      if (!levelId || !recordVideoId) return res.status(400).json({ message: 'Level ID and Record Video ID are required.' });
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) return res.status(404).json({ message: 'Level not found.' });
      const updatedRecords = level.records.filter(record => record.videoId !== recordVideoId);
      await prisma.level.update({ where: { id: levelId }, data: { records: updatedRecords } });
      return res.status(200).json({ message: 'Record removed successfully.' });
    }
  }

  // Fallback for any route not matched above
  return res.status(404).json({ message: `Route ${req.method} ${path} not found.` });
}