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

// ==================================================================
// ==================== THIS IS THE FIXED FUNCTION ====================
// ==================================================================
export async function updatePersonalRecord(req, res, decodedToken, recordId) {
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl } = req.body;
    if (!placement || !levelName || !difficulty || !videoUrl) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
      const newPlacement = Number(placement);
      const attemptsNum = attempts ? Number(attempts) : null;

      // 1. Get the original record to check ownership and old placement
      const originalRecord = await prisma.personalRecord.findUnique({
        where: { id: recordId }
      });

      if (!originalRecord) {
        return res.status(404).json({ message: 'Record not found.' });
      }

      if (originalRecord.userId !== decodedToken.userId) {
        return res.status(403).json({ message: 'You do not have permission to edit this record.' });
      }

      const oldPlacement = originalRecord.placement;

      // 2. If placement hasn't changed, just update the data (no transaction needed)
      if (newPlacement === oldPlacement) {
        await prisma.personalRecord.update({
          where: { id: recordId },
          data: { 
            levelName, 
            difficulty, 
            attempts: attemptsNum, 
            videoUrl, 
            thumbnailUrl 
          }
        });
        // 5. SEND RESPONSE
        return res.status(200).json({ message: 'Record updated successfully.' });
      }

      // 3. If placement *has* changed, we need a transaction
      await prisma.$transaction(async (tx) => {
        const userId = decodedToken.userId;

        if (newPlacement < oldPlacement) {
          // Moving record UP the list (e.g., 5 -> 3)
          // Shift records 3 and 4 DOWN (increment placement)
          await tx.personalRecord.updateMany({
            where: {
              userId: userId,
              placement: { gte: newPlacement, lt: oldPlacement }
            },
            data: { placement: { increment: 1 } }
          });
        } else if (newPlacement > oldPlacement) {
          // Moving record DOWN the list (e.g., 3 -> 5)
          // Shift records 4 and 5 UP (decrement placement)
          await tx.personalRecord.updateMany({
            where: {
              userId: userId,
              placement: { gt: oldPlacement, lte: newPlacement }
            },
            data: { placement: { decrement: 1 } }
          });
        }

        // 4. Finally, update the target record with all new data
        await tx.personalRecord.update({
          where: { id: recordId },
          data: {
            placement: newPlacement,
            levelName,
            difficulty,
            attempts: attemptsNum,
            videoUrl,
            thumbnailUrl
          }
        });
      });

      // 5. SEND RESPONSE
      return res.status(200).json({ message: 'Record updated successfully.' });

    } catch (error) {
      console.error('Failed to update record:', error); // Good to log the error
      // 5. SEND RESPONSE (on error)
      return res.status(500).json({ message: 'Failed to update record.' });
    }
}
// ==================================================================
// ==================================================================
// ==================================================================


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