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

  const { q: searchQuery } = req.query;

  if (!searchQuery || searchQuery.length < 3) {
    return res.status(200).json([]); // Return empty if query is too short
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        // Case-insensitive search for username
        username: {
          contains: searchQuery,
          mode: 'insensitive',
        },
        // Exclude the user performing the search from the results
        id: {
          not: decodedToken.userId,
        }
      },
      select: {
        id: true,
        username: true,
      },
      take: 10, // Limit results to prevent abuse
    });

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'User search failed.' });
  }
}