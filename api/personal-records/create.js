// api/personal-records/create.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
  
  const { levelName, difficulty, attempts, videoUrl } = req.body;
  if (!levelName || !difficulty || !videoUrl) {
    return res.status(400).json({ message: 'Level name, difficulty, and video URL are required.' });
  }

  try {
    const record = await prisma.personalRecord.create({
      data: {
        levelName,
        difficulty,
        attempts: attempts ? Number(attempts) : null,
        videoUrl,
        userId: decodedToken.userId,
      },
    });
    res.status(201).json(record);
  } catch (error) {
    console.error("Create personal record error:", error);
    res.status(500).json({ message: 'Failed to create record.' });
  }
}