// api/personal-records/index.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
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

  switch (req.method) {
    case 'GET':
      // Fetch all records for the user
      try {
        const records = await prisma.personalRecord.findMany({
          where: { userId: decodedToken.userId },
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(records);
      } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch records.' });
      }

    case 'POST':
      // Create a new record
      const { levelName, difficulty, attempts, videoUrl } = req.body;
      if (!levelName || !difficulty || !videoUrl) {
        return res.status(400).json({ message: 'Level name, difficulty, and video URL are required.' });
      }
      try {
        const record = await prisma.personalRecord.create({
          data: { levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, userId: decodedToken.userId },
        });
        return res.status(201).json(record);
      } catch (error) {
        return res.status(500).json({ message: 'Failed to create record.' });
      }

    case 'DELETE':
      // Delete a record
      const { recordId } = req.body;
      if (!recordId) {
        return res.status(400).json({ message: 'Record ID is required.' });
      }
      try {
        const recordToDelete = await prisma.personalRecord.findUnique({ where: { id: recordId } });
        if (!recordToDelete || recordToDelete.userId !== decodedToken.userId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.personalRecord.delete({ where: { id: recordId } });
        return res.status(200).json({ message: 'Record deleted successfully.' });
      } catch (error) {
        return res.status(500).json({ message: 'Failed to delete record.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}