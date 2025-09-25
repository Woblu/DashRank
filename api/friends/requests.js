import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT from auth header
const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error)
 {
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
    const requests = await prisma.friendship.findMany({
      where: {
        receiverId: decodedToken.userId,
        status: 'PENDING',
      },
      include: {
        // Include the username of the person who sent the request
        requester: {
          select: { 
            id: true, 
            username: true 
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch friend requests.' });
  }
}