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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { recordId } = req.body; // Can be a string ID or null to unpin

  try {
    // If a recordId is provided, we must verify the user owns it
    if (recordId) {
        const recordToPin = await prisma.personalRecord.findUnique({ where: { id: recordId } });
        
        // Security Check: Ensure the record exists and belongs to the logged-in user.
        if (!recordToPin || recordToPin.userId !== decodedToken.userId) {
            return res.status(403).json({ message: 'You can only pin your own records.' });
        }
    }
    
    await prisma.user.update({
      where: { id: decodedToken.userId },
      data: { pinnedRecordId: recordId }, // Sets the new pinned record ID, or null to unpin
    });
    
    res.status(200).json({ message: recordId ? 'Record pinned successfully.' : 'Record unpinned successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update pinned record.' });
  }
}