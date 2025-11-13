// --- THIS IS THE FIX ---
// I have removed 'PersonalRecordProgressStatus' from this import
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
  // 1. ADD 'status' to the destructuring
  const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl, status } = req.body;
  
  // 2. Validate the new 'status' field
  if (!placement || !levelName || !difficulty || !videoUrl || !status) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }
  if (status !== 'COMPLETED' && status !== 'IN_PROGRESS') {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    await prisma.$transaction([
      prisma.personalRecord.updateMany({
        where: { 
          userId: decodedToken.userId, 
          placement: { gte: Number(placement) },
          status: status // Only shift records in the same status list
        },
        data: { placement: { increment: 1 } },
      }),
      prisma.personalRecord.create({
        data: {
          placement: Number(placement),
          levelName,
          difficulty,
          attempts: attempts ? Number(attempts) : null,
          videoUrl,
          thumbnailUrl,
          userId: decodedToken.userId,
          status: status // 3. SAVE the status to the database
        },
      }),
    ]);
    return res.status(201).json({ message: 'Record added successfully.' });
  } catch (error) {
    console.error('Create record error:', error);
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
    // 1. ADD 'status' to the destructuring
    const { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl, status } = req.body;

    // 2. Validate the new 'status' field
    if (!placement || !levelName || !difficulty || !videoUrl || !status) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }
    if (status !== 'COMPLETED' && status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
      const newPlacement = Number(placement);
      const attemptsNum = attempts ? Number(attempts) : null;

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
      const oldStatus = originalRecord.status;

      await prisma.$transaction(async (tx) => {
        const userId = decodedToken.userId;

        // 3. Handle status change (moving from Runs to Completions, or vice-versa)
        if (status !== oldStatus) {
          // Decrement all items in the OLD list that were below the item
          await tx.personalRecord.updateMany({
            where: {
              userId: userId,
              status: oldStatus,
              placement: { gt: oldPlacement }
            },
            data: { placement: { decrement: 1 } }
          });
          // Increment all items in the NEW list that are at or above the new placement
          await tx.personalRecord.updateMany({
            where: {
              userId: userId,
              status: status,
              placement: { gte: newPlacement }
            },
            data: { placement: { increment: 1 } }
          });
        } 
        // 4. Handle placement change (staying in the same list)
        else if (newPlacement !== oldPlacement) {
          if (newPlacement < oldPlacement) {
            // Moving UP
            await tx.personalRecord.updateMany({
              where: {
                userId: userId,
                status: status, // Only affect records in the same list
                placement: { gte: newPlacement, lt: oldPlacement }
              },
              data: { placement: { increment: 1 } }
            });
          } else { // newPlacement > oldPlacement
            // Moving DOWN
            await tx.personalRecord.updateMany({
              where: {
                userId: userId,
                status: status, // Only affect records in the same list
                placement: { gt: oldPlacement, lte: newPlacement }
              },
              data: { placement: { decrement: 1 } }
            });
          }
        }

        // 5. Finally, update the target record with all new data
        await tx.personalRecord.update({
          where: { id: recordId },
          data: {
            placement: newPlacement,
            levelName,
            difficulty,
            attempts: attemptsNum,
            videoUrl,
            thumbnailUrl,
            status: status // SAVE the new status
          }
        });
      });

      return res.status(200).json({ message: 'Record updated successfully.' });

    } catch (error) {
      console.error('Failed to update record:', error); 
      return res.status(500).json({ message: 'Failed to update record.' });
    }
}

export async function deletePersonalRecord(req, res, decodedToken) {
  const { recordId } = req.body;
  if (!recordId) return res.status(400).json({ message: 'Record ID is required.' });

  try {
    const recordToDelete = await prisma.personalRecord.findFirst({ where: { id: recordId, userId: decodedToken.userId } });
    if (!recordToDelete) return res.status(4G03).json({ message: 'Record not found or you do not have permission to delete it.' });
    
    await prisma.$transaction([
      prisma.personalRecord.delete({ where: { id: recordId } }),
      prisma.personalRecord.updateMany({
        where: { 
          userId: decodedToken.userId, 
          placement: { gt: recordToDelete.placement },
          status: recordToDelete.status // Only shift records in the same list
        },
        data: { placement: { decrement: 1 } },
      }),
    ]);
    return res.status(200).json({ message: 'Record deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete record.' });
  }
}