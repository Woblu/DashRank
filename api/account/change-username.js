// api/account/change-username.js
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
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { newUsername } = req.body;
  if (!newUsername || newUsername.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
  }

  try {
    // Check if the new username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: newUsername },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    // Update the username
    await prisma.user.update({
      where: { id: decodedToken.userId },
      data: { username: newUsername },
    });

    return res.status(200).json({ message: 'Username updated successfully. Please log in again.' });
  } catch (error) {
    console.error('Change username error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}