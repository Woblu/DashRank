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
  const userId = decodedToken.userId;

  // --- HANDLE GET REQUESTS (List Friends or List Requests) ---
  if (req.method === 'GET') {
    const { filter } = req.query; // e.g., /api/friends?filter=requests

    try {
      if (filter === 'requests') {
        const requests = await prisma.friendship.findMany({
          where: { receiverId: userId, status: 'PENDING' },
          include: { requester: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(requests);
      }

      // Default action is to list accepted friends
      const friendships = await prisma.friendship.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
        include: {
          requester: { select: { id: true, username: true } },
          receiver: { select: { id: true, username: true } },
        },
      });
      const friends = friendships.map(f => f.requesterId === userId ? f.receiver : f.requester);
      return res.status(200).json(friends);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch data.' });
    }
  }

  // --- HANDLE POST REQUESTS (Send Request) ---
  if (req.method === 'POST') {
    const { action, receiverId } = req.body;
    if (action !== 'request') return res.status(400).json({ message: 'Invalid action.' });
    if (!receiverId) return res.status(400).json({ message: 'Receiver ID is required.' });
    if (userId === receiverId) return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });

    try {
      const existing = await prisma.friendship.findFirst({ where: { OR: [{ requesterId: userId, receiverId }, { requesterId: receiverId, receiverId: userId }] } });
      if (existing && existing.status !== 'DECLINED') return res.status(400).json({ message: `A friendship or pending request already exists.` });
      
      if (existing && existing.status === 'DECLINED') {
        await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'PENDING', requesterId: userId, receiverId }
        });
      } else {
        await prisma.friendship.create({ data: { requesterId: userId, receiverId, status: 'PENDING' } });
      }
      return res.status(201).json({ message: 'Friend request sent.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to send friend request.' });
    }
  }

  // --- HANDLE PUT REQUESTS (Respond to Request) ---
  if (req.method === 'PUT') {
    const { action, friendshipId, response } = req.body;
    if (action !== 'response') return res.status(400).json({ message: 'Invalid action.'});
    if (!friendshipId || !['ACCEPTED', 'DECLINED'].includes(response)) {
      return res.status(400).json({ message: 'Friendship ID and a valid response are required.' });
    }
    
    try {
      const friendship = await prisma.friendship.findFirst({ where: { id: friendshipId, receiverId: userId } });
      if (!friendship) return res.status(403).json({ message: 'Request not found or you do not have permission to respond.' });
      if (friendship.status !== 'PENDING') return res.status(400).json({ message: 'This request is no longer pending.' });

      await prisma.friendship.update({ where: { id: friendshipId }, data: { status: response } });
      return res.status(200).json({ message: `Friend request has been ${response.toLowerCase()}.` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to respond to friend request.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}