// api/personal-records/delete.js
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
  
  const { recordId } = req.body;
  if (!recordId) {
    return res.status(400).json({ message: 'Record ID is required.' });
  }

  try {
    const record = await prisma.personalRecord.findUnique({ where: { id: recordId } });
    if (!record || record.userId !== decodedToken.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    await prisma.personalRecord.delete({ where: { id: recordId } });
    res.status(200).json({ message: 'Record deleted successfully.' });
  } catch (error) {
    console.error("Delete personal record error:", error);
    res.status(500).json({ message: 'Failed to delete record.' });
  }
}