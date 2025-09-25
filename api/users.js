import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT from auth header
const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const viewerId = decodedToken.userId;

  // --- HANDLE GET REQUESTS (Search or Get Profile) ---
  if (req.method === 'GET') {
    const { q: searchQuery, username } = req.query;

    // --- User Search Logic ---
    if (searchQuery) {
      if (searchQuery.length < 3) return res.status(200).json([]);
      const users = await prisma.user.findMany({
        where: { username: { contains: searchQuery, mode: 'insensitive' }, id: { not: viewerId } },
        select: { id: true, username: true },
        take: 10,
      });
      return res.status(200).json(users);
    }

    // --- Get Profile Logic ---
    if (username) {
      const profileUser = await prisma.user.findUnique({ where: { username } });
      if (!profileUser) return res.status(404).json({ message: 'User not found' });

      let friendStatus = 'not_friends';
      if (viewerId === profileUser.id) {
        friendStatus = 'self';
      } else {
        const friendship = await prisma.friendship.findFirst({ where: { OR: [{ requesterId: viewerId, receiverId: profileUser.id }, { requesterId: profileUser.id, receiverId: viewerId }] } });
        if (friendship) friendStatus = friendship.status;
      }

      if (friendStatus !== 'ACCEPTED' && friendStatus !== 'self') {
        return res.status(403).json({ message: 'You must be friends to view this profile.', data: { userId: profileUser.id, username: profileUser.username, friendStatus }});
      }

      const personalRecords = await prisma.personalRecord.findMany({ where: { userId: profileUser.id, status: 'COMPLETED' }, orderBy: { placement: 'asc' } });
      const pinnedRecord = profileUser.pinnedRecordId ? await prisma.personalRecord.findUnique({ where: { id: profileUser.pinnedRecordId } }) : null;
      
      const totalDemons = personalRecords.length;
      const recordsWithAttempts = personalRecords.filter(r => r.attempts > 0);
      const averageAttempts = recordsWithAttempts.length > 0 ? Math.round(recordsWithAttempts.reduce((sum, r) => sum + r.attempts, 0) / recordsWithAttempts.length) : 0;

      return res.status(200).json({
        id: profileUser.id, username: profileUser.username, createdAt: profileUser.createdAt, friendStatus,
        stats: { totalDemons, averageAttempts },
        pinnedRecord, progressionTracker: personalRecords,
      });
    }
  }

  // --- HANDLE POST REQUESTS (Pin Record) ---
  if (req.method === 'POST') {
    const { action, recordId } = req.body;
    if (action === 'pin') {
      if (recordId) {
        const recordToPin = await prisma.personalRecord.findUnique({ where: { id: recordId } });
        if (!recordToPin || recordToPin.userId !== viewerId) {
          return res.status(403).json({ message: 'You can only pin your own records.' });
        }
      }
      await prisma.user.update({ where: { id: viewerId }, data: { pinnedRecordId: recordId } });
      return res.status(200).json({ message: recordId ? 'Record pinned successfully.' : 'Record unpinned successfully.' });
    }
  }

  return res.status(400).json({ message: 'Invalid request' });
}