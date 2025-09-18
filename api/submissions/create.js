// api/submissions/create.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 1. Verify Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }

  // 2. Validate Input
  const { levelName, player, percent, videoId, rawFootageLink, notes } = req.body;
  if (!levelName || !player || !percent || !videoId || !rawFootageLink) {
    return res.status(400).json({ message: 'Please fill out all required fields.' });
  }

  // 3. Create the Submission
  try {
    await prisma.submission.create({
      data: {
        levelName,
        player,
        percent: Number(percent),
        videoId,
        rawFootageLink,
        notes: notes || null,
        submittedById: decodedToken.userId, // Link submission to the logged-in user
      },
    });
    return res.status(201).json({ message: 'Submission received! It will be reviewed by a moderator.' });
  } catch (error) {
    console.error('Submission Error:', error);
    return res.status(500).json({ message: 'An error occurred while saving the submission.' });
  }
}