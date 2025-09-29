import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches a user's profile if friends, or searches for users by query.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function getUser(req, res, decodedToken) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const searchQuery = url.searchParams.get('q');
  const username = url.searchParams.get('username');
  const viewerId = decodedToken.userId;

  try {
    // --- User Search Logic ---
    if (searchQuery) {
      if (searchQuery.length < 3) return res.status(200).json([]);
      const users = await prisma.user.findMany({
        where: { username: { contains: searchQuery, mode: 'insensitive' }, id: { not: viewerId } },
        select: { id: true, username: true },
        take: 10,
      });
      return res.status(200).json(users);
    }

    // --- Get Profile Logic ---
    if (username) {
      const profileUser = await prisma.user.findUnique({ where: { username } });
      if (!profileUser) return res.status(404).json({ message: 'User not found' });

      let friendStatus = 'not_friends';
      if (viewerId === profileUser.id) {
        friendStatus = 'self';
      } else {
        const friendship = await prisma.friendship.findFirst({ where: { status: { not: 'DECLINED' }, OR: [{ requesterId: viewerId, receiverId: profileUser.id }, { requesterId: profileUser.id, receiverId: viewerId }] } });
        if (friendship) friendStatus = friendship.status;
      }

      if (friendStatus !== 'ACCEPTED' && friendStatus !== 'self') {
        return res.status(403).json({ message: 'You must be friends to view this profile.', data: { userId: profileUser.id, username: profileUser.username, friendStatus }});
      }

      const personalRecords = await prisma.personalRecord.findMany({ where: { userId: profileUser.id, status: 'COMPLETED' }, orderBy: { placement: 'asc' } });
      const pinnedRecord = profileUser.pinnedRecordId ? await prisma.personalRecord.findUnique({ where: { id: profileUser.pinnedRecordId } }) : null;
      
      const totalDemons = personalRecords.length;
      const recordsWithAttempts = personalRecords.filter(r => r.attempts > 0);
      const averageAttempts = recordsWithAttempts.length > 0 ? Math.round(recordsWithAttempts.reduce((sum, r) => sum + r.attempts, 0) / recordsWithAttempts.length) : 0;

      return res.status(200).json({
        id: profileUser.id, username: profileUser.username, createdAt: profileUser.createdAt, friendStatus,
        stats: { totalDemons, averageAttempts },
        pinnedRecord, progressionTracker: personalRecords,
      });
    }
  } catch (error) {
    console.error("User handler error:", error);
    return res.status(500).json({ message: 'Error processing user request.' });
  }
}

/**
 * Pins or unpins a record for the authenticated user.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function pinRecord(req, res, decodedToken) {
  const { recordId } = req.body;
  try {
    if (recordId) {
      const recordToPin = await prisma.personalRecord.findUnique({ where: { id: recordId } });
      if (!recordToPin || recordToPin.userId !== decodedToken.userId) {
        return res.status(403).json({ message: 'You can only pin your own records.' });
      }
    }
    await prisma.user.update({ where: { id: decodedToken.userId }, data: { pinnedRecordId: recordId } });
    return res.status(200).json({ message: recordId ? 'Record pinned successfully.' : 'Record unpinned successfully.' });
  } catch (error) {
    console.error("Pin record error:", error);
    return res.status(500).json({ message: 'Failed to update pinned record.' });
  }
}