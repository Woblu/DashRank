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
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { friendshipId, response } = req.body; // response should be 'ACCEPTED' or 'DECLINED'

  if (!friendshipId || !['ACCEPTED', 'DECLINED'].includes(response)) {
    return res.status(400).json({ message: 'Friendship ID and a valid response (ACCEPTED or DECLINED) are required.' });
  }

  try {
    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });

    // Security Check: Ensure the friendship exists and the current user is the one who received the request.
    if (!friendship || friendship.receiverId !== decodedToken.userId) {
      return res.status(403).json({ message: 'You do not have permission to respond to this request.' });
    }
    
    // Ensure the request is still pending
    if (friendship.status !== 'PENDING') {
        return res.status(400).json({ message: 'This request is no longer pending.' });
    }

    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: response },
    });

    res.status(200).json({ message: `Friend request has been ${response.toLowerCase()}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to respond to friend request.' });
  }
}