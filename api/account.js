import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const decodedToken = verifyToken(req.headers.authorization);
  if (!decodedToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { action, currentPassword, newPassword, newUsername, password } = req.body;
  const userId = decodedToken.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // --- HANDLE PASSWORD CHANGE ---
    if (action === 'change-password') {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required.' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Incorrect current password.' });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return res.status(200).json({ message: 'Password changed successfully.' });
    }

    // --- HANDLE USERNAME CHANGE ---
    if (action === 'change-username') {
      if (!newUsername || !password) {
        return res.status(400).json({ message: 'New username and your password are required.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
      });

      return res.status(200).json({ message: 'Username changed successfully.' });
    }
  } catch (error) {
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({ message: 'That username is already taken.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'An error occurred.' });
  }

  return res.status(400).json({ message: 'Invalid action specified.' });
}