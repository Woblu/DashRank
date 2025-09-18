// api/admin/update-submission.js
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
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!ROLES.includes(decodedToken.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }

  // 2. Validate Input
  const { submissionId, newStatus } = req.body;
  if (!submissionId || !['APPROVED', 'REJECTED'].includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid request body. Requires submissionId and newStatus.' });
  }

  // 3. Update Submission and Level Records
  try {
    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: newStatus },
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    // If the submission was approved, add it as a record to the main level
    if (newStatus === 'APPROVED') {
      await prisma.level.updateMany({
        where: { name: submission.levelName },
        data: {
          records: {
            push: {
              username: submission.player,
              percent: submission.percent,
              videoId: submission.videoId,
            },
          },
        },
      });
    }

    res.status(200).json({ message: `Submission status updated to ${newStatus}` });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ message: 'Internal server error while updating submission.' });
  }
}