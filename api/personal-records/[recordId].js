// api/personal-records/[recordId].js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

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

  try {
    const record = await prisma.personalRecord.findUnique({
      where: { id: recordId },
    });

    // Security check: ensure the record exists and belongs to the user making the request
    if (!record || record.userId !== decodedToken.userId) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    res.status(200).json(record);
  } catch (error) {
    console.error(`Error fetching personal record ${recordId}:`, error);
    res.status(500).json({ message: 'Failed to fetch record.' });
  }
}