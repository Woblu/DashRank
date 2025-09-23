import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { recordId } = req.query;

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

  // Handle GET request to fetch a single record
  if (req.method === 'GET') {
    try {
      const record = await prisma.personalRecord.findFirst({
        where: {
          id: recordId,
          userId: decodedToken.userId, // Ensures users can only get their own records
        },
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found.' });
      }

      return res.status(200).json(record);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch record.' });
    }
  }
  // Handle PUT request to update a record
  else if (req.method === 'PUT') {
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;

    if (!placement || !levelName || !difficulty || !videoUrl) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
      const newPlacement = Number(placement);

      await prisma.$transaction(async (tx) => {
        const originalRecord = await tx.personalRecord.findFirst({
          where: { id: recordId, userId: decodedToken.userId },
        });

        if (!originalRecord) {
          throw new Error('Record not found');
        }

        const oldPlacement = originalRecord.placement;

        if (oldPlacement === newPlacement) {
          await tx.personalRecord.update({
            where: { id: recordId },
            data: { levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, thumbnailUrl },
          });
          return;
        }

        if (oldPlacement > newPlacement) {
          await tx.personalRecord.updateMany({
            where: {
              userId: decodedToken.userId,
              placement: { gte: newPlacement, lt: oldPlacement },
            },
            data: { placement: { increment: 1 } },
          });
        } else {
          await tx.personalRecord.updateMany({
            where: {
              userId: decodedToken.userId,
              placement: { gt: oldPlacement, lte: newPlacement },
            },
            data: { placement: { decrement: 1 } },
          });
        }

        await tx.personalRecord.update({
          where: { id: recordId },
          data: {
            placement: newPlacement,
            levelName,
            difficulty,
            attempts: attempts ? Number(attempts) : null,
            videoUrl,
            thumbnailUrl,
          },
        });
      });

      return res.status(200).json({ message: 'Record updated successfully.' });

    } catch (error) {
      if (error.message === 'Record not found') {
        return res.status(404).json({ message: 'Record not found or you do not have permission to edit it.' });
      }
      console.error(error);
      return res.status(500).json({ message: 'Failed to update record.' });
    }
  }
  // If method is not GET or PUT, deny it
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}