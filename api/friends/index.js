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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: decodedToken.userId },
          { receiverId: decodedToken.userId },
        ],
      },
      include: {
        requester: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    // The query returns Friendship objects. We need to process this
    // into a clean list of the other users (the friends).
    const friends = friendships.map(friendship => {
      if (friendship.requesterId === decodedToken.userId) {
        return friendship.receiver;
      } else {
        return friendship.requester;
      }
    });

    res.status(200).json(friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch friends list.' });
  }
}