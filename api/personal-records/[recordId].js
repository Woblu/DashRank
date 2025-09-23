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
      // We use updateMany with the userId to ensure a user can only update their own records.
      const result = await prisma.personalRecord.updateMany({
        where: {
          id: recordId,
          userId: decodedToken.userId, 
        },
        data: {
          placement: Number(placement),
          levelName,
          difficulty,
          attempts: attempts ? Number(attempts) : null,
          videoUrl,
          thumbnailUrl,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({ message: 'Record not found or you do not have permission to edit it.' });
      }

      return res.status(200).json({ message: 'Record updated successfully.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to update record.' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}