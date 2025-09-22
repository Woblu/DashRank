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
      try {
        const records = await prisma.personalRecord.findMany({
          where: { userId: decodedToken.userId },
          orderBy: { placement: 'asc' }, // Order by placement
        });
        return res.status(200).json(records);
      } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch records.' });
      }

    case 'POST':
      const { placement, levelName, difficulty, attempts, videoUrl, rawFootageLink } = req.body;
      if (!placement || !levelName || !difficulty || !videoUrl) {
        return res.status(400).json({ message: 'Placement, level name, difficulty, and video URL are required.' });
      }
      try {
        await prisma.$transaction([
          // 1. Shift placements of existing records to make room for the new one
          prisma.personalRecord.updateMany({
            where: { userId: decodedToken.userId, placement: { gte: Number(placement) } },
            data: { placement: { increment: 1 } },
          }),
          // 2. Create the new record at the specified placement
          prisma.personalRecord.create({
            data: {
              placement: Number(placement),
              levelName,
              difficulty,
              attempts: attempts ? Number(attempts) : null,
              videoUrl,
              rawFootageLink,
              userId: decodedToken.userId
            },
          }),
        ]);
        return res.status(201).json({ message: 'Record added successfully.' });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to create record.' });
      }

    case 'DELETE':
      const { recordId } = req.body;
      if (!recordId) {
        return res.status(400).json({ message: 'Record ID is required.' });
      }
      try {
        const recordToDelete = await prisma.personalRecord.findFirst({
          where: { id: recordId, userId: decodedToken.userId },
        });

        if (!recordToDelete) {
          return res.status(403).json({ message: 'Record not found or you do not have permission to delete it.' });
        }
        
        await prisma.$transaction([
          // 1. Delete the record
          prisma.personalRecord.delete({ where: { id: recordId } }),
          // 2. Shift placements of subsequent records to fill the gap
          prisma.personalRecord.updateMany({
            where: { userId: decodedToken.userId, placement: { gt: recordToDelete.placement } },
            data: { placement: { decrement: 1 } },
          }),
        ]);
        return res.status(200).json({ message: 'Record deleted successfully.' });
      } catch (error) {
        return res.status(500).json({ message: 'Failed to delete record.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}