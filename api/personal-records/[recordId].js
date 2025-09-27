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
  const { recordId } = req.query;

  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const viewerId = decodedToken.userId;

  // --- HANDLE GET REQUEST (View a single record) ---
  if (req.method === 'GET') {
    try {
      const record = await prisma.personalRecord.findUnique({
        where: { id: recordId },
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found.' });
      }

      // PERMISSION CHECK:
      // Allow access if the viewer is the owner OR is friends with the owner.
      const isOwner = record.userId === viewerId;
      
      const friendship = await prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: viewerId, receiverId: record.userId },
            { requesterId: record.userId, receiverId: viewerId },
          ],
        },
      });
      const isFriend = !!friendship;

      if (!isOwner && !isFriend) {
        return res.status(403).json({ message: 'You do not have permission to view this record.' });
      }

      // If permission is granted, return the record
      return res.status(200).json(record);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to fetch record.' });
    }
  }
  
  // --- HANDLE PUT REQUEST (Update a record) ---
  if (req.method === 'PUT') {
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;

    if (!placement || !levelName || !difficulty || !videoUrl) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
      const newPlacement = Number(placement);

      await prisma.$transaction(async (tx) => {
        const originalRecord = await tx.personalRecord.findFirst({
          where: { id: recordId, userId: viewerId },
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
            where: { userId: viewerId, placement: { gte: newPlacement, lt: oldPlacement } },
            data: { placement: { increment: 1 } },
          });
        } else {
          await tx.personalRecord.updateMany({
            where: { userId: viewerId, placement: { gt: oldPlacement, lte: newPlacement } },
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
  
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}