// api/admin/submissions.js
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const ROLES = ['ADMIN', 'MODERATOR'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

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

    const submissions = await prisma.submission.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}