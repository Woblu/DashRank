import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { action, email, username, password } = req.body;

  // --- HANDLE USER REGISTRATION ---
  if (action === 'register') {
    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Email, username, and password are required.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
      });

      return res.status(201).json({ message: 'User created successfully.' });
    } catch (error) {
      if (error.code === 'P2002') { // Prisma unique constraint violation
        return res.status(409).json({ message: 'Username or email already exists.' });
      }
      return res.status(500).json({ message: 'Failed to create user.' });
    }
  }

  // --- HANDLE USER LOGIN ---
  if (action === 'login') {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({ token });
    } catch (error) {
      return res.status(500).json({ message: 'Login failed.' });
    }
  }

  return res.status(400).json({ message: 'Invalid action specified.' });
}