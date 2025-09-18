// api/admin/remove-record.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const ROLES = ['ADMIN', 'MODERATOR'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 1. Verify Authentication and Role
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!ROLES.includes(decoded.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 2. Get data and find the level
  const { levelId, recordVideoId } = req.body;
  if (!levelId || !recordVideoId) {
    return res.status(400).json({ message: 'Level ID and Record Video ID are required.' });
  }

  try {
    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      return res.status(404).json({ message: 'Level not found.' });
    }

    // 3. Filter out the record to be removed
    const updatedRecords = level.records.filter(record => record.videoId !== recordVideoId);

    // 4. Update the level with the new records array
    await prisma.level.update({
      where: { id: levelId },
      data: { records: updatedRecords },
    });

    res.status(200).json({ message: 'Record removed successfully.' });
  } catch (error) {
    console.error('Remove record error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}