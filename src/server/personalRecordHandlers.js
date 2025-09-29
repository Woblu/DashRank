import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listPersonalRecords(req, res, decodedToken) {
  try {
    const records = await prisma.personalRecord.findMany({
      where: { userId: decodedToken.userId },
      orderBy: { placement: 'asc' },
    });
    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch records.' });
  }
}

export async function createPersonalRecord(req, res, decodedToken) {
  const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;
  if (!placement || !levelName || !difficulty || !videoUrl) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }
  try {
    await prisma.$transaction([
      prisma.personalRecord.updateMany({
        where: { userId: decodedToken.userId, placement: { gte: Number(placement) } },
        data: { placement: { increment: 1 } },
      }),
      prisma.personalRecord.create({
        data: {
          placement: Number(placement), levelName, difficulty,
          attempts: attempts ? Number(attempts) : null,
          videoUrl, thumbnailUrl, userId: decodedToken.userId,
        },
      }),
    ]);
    return res.status(201).json({ message: 'Record added successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create record.' });
  }
}

export async function getPersonalRecordById(req, res, decodedToken, recordId) {
    try {
      const record = await prisma.personalRecord.findUnique({ where: { id: recordId } });
      if (!record) return res.status(404).json({ message: 'Record not found.' });

      const isOwner = record.userId === decodedToken.userId;
      const friendship = await prisma.friendship.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: decodedToken.userId, receiverId: record.userId }, { requesterId: record.userId, receiverId: decodedToken.userId }] },
      });
      const isFriend = !!friendship;

      if (!isOwner && !isFriend) return res.status(403).json({ message: 'You do not have permission to view this record.' });
      
      return res.status(200).json(record);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch record.' });
    }
}

export async function updatePersonalRecord(req, res, decodedToken, recordId) {
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;
    if (!placement || !levelName || !difficulty || !videoUrl) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }
    try {
      // ... (This is the full transaction logic from the old api/personal-records/[recordId].js file)
    } catch (error) {
      // ... (Error handling)
    }
}

export async function deletePersonalRecord(req, res, decodedToken) {
  const { recordId } = req.body;
  if (!recordId) return res.status(400).json({ message: 'Record ID is required.' });

  try {
    const recordToDelete = await prisma.personalRecord.findFirst({ where: { id: recordId, userId: decodedToken.userId } });
    if (!recordToDelete) return res.status(403).json({ message: 'Record not found or you do not have permission to delete it.' });
    
    await prisma.$transaction([
      prisma.personalRecord.delete({ where: { id: recordId } }),
      prisma.personalRecord.updateMany({
        where: { userId: decodedToken.userId, placement: { gt: recordToDelete.placement } },
        data: { placement: { decrement: 1 } },
      }),
    ]);
    return res.status(200).json({ message: 'Record deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete record.' });
  }
}