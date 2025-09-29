import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function registerUser(req, res) {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ message: 'Email, username, and password are required.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, username, password: hashedPassword } });
    return res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Username or email already exists.' });
    return res.status(500).json({ message: 'Failed to create user.' });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.' });
  }
}