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

  if (req.method === 'PUT') {
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;

    if (!placement || !levelName || !difficulty || !videoUrl) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
      const newPlacement = Number(placement);

      // Use a transaction to safely update the list
      await prisma.$transaction(async (tx) => {
        // First, find the original record to get its old placement
        const originalRecord = await tx.personalRecord.findFirst({
          where: { id: recordId, userId: decodedToken.userId },
        });

        // If it doesn't exist, throw an error to cancel the transaction
        if (!originalRecord) {
          throw new Error('Record not found');
        }

        const oldPlacement = originalRecord.placement;

        // If the placement hasn't changed, just do a simple update
        if (oldPlacement === newPlacement) {
          await tx.personalRecord.update({
            where: { id: recordId },
            data: { levelName, difficulty, attempts: attempts ? Number(attempts) : null, videoUrl, thumbnailUrl },
          });
          return;
        }

        // --- Re-ordering Logic ---
        // 1. Shift records between the old and new placements
        if (oldPlacement > newPlacement) {
          // Moving record UP the list (e.g., #5 -> #3)
          // Increment placement of records that are now between the new and old spots
          await tx.personalRecord.updateMany({
            where: {
              userId: decodedToken.userId,
              placement: { gte: newPlacement, lt: oldPlacement },
            },
            data: { placement: { increment: 1 } },
          });
        } else { // oldPlacement < newPlacement
          // Moving record DOWN the list (e.g., #3 -> #5)
          // Decrement placement of records that are now between the old and new spots
          await tx.personalRecord.updateMany({
            where: {
              userId: decodedToken.userId,
              placement: { gt: oldPlacement, lte: newPlacement },
            },
            data: { placement: { decrement: 1 } },
          });
        }

        // 2. Finally, update the actual record with its new placement and data
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
      // Catch the "Record not found" error from the transaction
      if (error.message === 'Record not found') {
        return res.status(404).json({ message: 'Record not found or you do not have permission to edit it.' });
      }
      console.error(error);
      return res.status(500).json({ message: 'Failed to update record.' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}