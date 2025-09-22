// api/personal-records/mine.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  try {
    const records = await prisma.personalRecord.findMany({
      where: { userId: decodedToken.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(records);
  } catch (error) {
    console.error("Fetch personal records error:", error);
    res.status(500).json({ message: 'Failed to fetch records.' });
  }
}