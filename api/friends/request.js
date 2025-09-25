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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { receiverId } = req.body;
  const requesterId = decodedToken.userId;

  if (!receiverId) {
    return res.status(400).json({ message: 'Receiver ID is required.' });
  }
  
  if (requesterId === receiverId) {
    return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
  }

  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
        if(existing.status === 'DECLINED') {
             // If a previous request was declined, this allows the user to send a new one.
             // It finds the old record and resets it to PENDING.
             await prisma.friendship.update({
                where: { id: existing.id },
                data: { status: 'PENDING', requesterId: requesterId, receiverId: receiverId }
            });
            return res.status(201).json({ message: 'Friend request sent.' });
        }
      return res.status(400).json({ message: `A friendship or pending request already exists.` });
    }

    await prisma.friendship.create({
      data: { 
        requesterId: requesterId, 
        receiverId: receiverId, 
        status: 'PENDING' 
      },
    });
    
    res.status(201).json({ message: 'Friend request sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send friend request.' });
  }
}