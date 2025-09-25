import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { username } = req.query;
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

  const viewerId = decodedToken.userId;

  try {
    const profileUser = await prisma.user.findUnique({ where: { username } });
    if (!profileUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (viewerId === profileUser.id) {
        // User is viewing their own profile, grant full access
    } else {
        const friendship = await prisma.friendship.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { requesterId: viewerId, receiverId: profileUser.id },
              { requesterId: profileUser.id, receiverId: viewerId },
            ],
          },
        });

        if (!friendship) {
          return res.status(403).json({ message: 'You must be friends to view this profile.' });
        }
    }

    // If access is granted, fetch all profile data
    const personalRecords = await prisma.personalRecord.findMany({
      where: { userId: profileUser.id, status: 'COMPLETED' },
      orderBy: { placement: 'asc' },
    });

    const pinnedRecord = profileUser.pinnedRecordId
      ? await prisma.personalRecord.findUnique({ where: { id: profileUser.pinnedRecordId } })
      : null;
    
    // Calculate stats
    const totalDemons = personalRecords.length;
    const recordsWithAttempts = personalRecords.filter(r => r.attempts > 0);
    const averageAttempts = recordsWithAttempts.length > 0
      ? Math.round(recordsWithAttempts.reduce((sum, r) => sum + r.attempts, 0) / recordsWithAttempts.length)
      : 0;

    const profileData = {
      id: profileUser.id,
      username: profileUser.username,
      createdAt: profileUser.createdAt,
      stats: {
        totalDemons,
        averageAttempts,
      },
      pinnedRecord,
      progressionTracker: personalRecords,
    };

    return res.status(200).json(profileData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error while fetching profile.' });
  }
}