// src/server/moderationHandlers.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * (ADMIN) Fetches submissions based on a status query.
 */
export async function listSubmissions(req, res) {
  try {
    const { status = 'PENDING' } = req.query;
    const submissions = await prisma.submission.findMany({
      where: { status: status.toUpperCase() },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json(submissions);
  } catch (error) {
    console.error('List submissions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * (ADMIN) Updates the status of a submission.
 */
export async function updateSubmissionStatus(req, res) {
  const { submissionId, newStatus } = req.body;
  if (!submissionId || !['APPROVED', 'REJECTED'].includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid request body.' });
  }
  try {
    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: newStatus },
    });
    if (newStatus === 'APPROVED') {
      await prisma.level.updateMany({
        where: { name: submission.levelName },
        data: {
          records: {
            push: {
              username: submission.player,
              percent: submission.percent,
              videoId: submission.videoId,
            },
          },
        },
      });
    }
    return res.status(200).json({ message: `Submission status updated to ${newStatus}` });
  } catch (error) {
    console.error('Update submission error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * (USER) Creates a new report for a layout.
 */
export async function createLayoutReport(req, res, decodedToken) {
    const { layoutId, reason } = req.body;
    if (!layoutId || !reason) {
        return res.status(400).json({ message: 'Layout ID and reason are required.' });
    }
    try {
        await prisma.layoutReport.create({
            data: {
                reportedLayoutId: layoutId,
                reason,
                reporterId: decodedToken.userId,
            },
        });
        return res.status(201).json({ message: 'Report submitted successfully.' });
    } catch (error) {
        console.error('Create layout report error:', error);
        return res.status(500).json({ message: 'Failed to submit report.' });
    }
}

/**
 * (ADMIN) Lists all pending layout reports.
 */
export async function listLayoutReports(req, res) {
    try {
        const reports = await prisma.layoutReport.findMany({
            where: { status: 'PENDING' },
            include: {
                reporter: { select: { username: true } },
                reportedLayout: { select: { id: true, levelName: true, creator: { select: { id: true, username: true } } } },
            },
            orderBy: { createdAt: 'asc' },
        });
        return res.status(200).json(reports);
    } catch (error) {
        console.error('List layout reports error:', error);
        return res.status(500).json({ message: 'Failed to fetch reports.' });
    }
}

/**
 * (ADMIN) Updates the status of a layout report.
 */
export async function updateReportStatus(req, res) {
    const { reportId, status } = req.body;
    if (!reportId || !status) {
        return res.status(400).json({ message: 'Report ID and status are required.' });
    }
    try {
        await prisma.layoutReport.update({
            where: { id: reportId },
            data: { status },
        });
        return res.status(200).json({ message: 'Report status updated.' });
    } catch (error) {
        console.error('Update report status error:', error);
        return res.status(500).json({ message: 'Failed to update report.' });
    }
}

/**
 * (ADMIN) Bans a user from the Creator's Workshop.
 */
export async function banUserFromWorkshop(req, res) {
    const { userIdToBan } = req.body;
    if (!userIdToBan) {
        return res.status(400).json({ message: 'User ID to ban is required.' });
    }
    try {
        await prisma.user.update({
            where: { id: userIdToBan },
            data: { isWorkshopBanned: true },
        });
        return res.status(200).json({ message: 'User has been banned from the workshop.' });
    } catch (error) {
        console.error('Ban user error:', error);
        return res.status(500).json({ message: 'Failed to ban user.' });
    }
}

/**
 * (ADMIN) Deletes a layout and all its related data.
 * This is a cascading delete performed in a transaction.
 */
export async function deleteLayoutAsAdmin(req, res) {
    // NOTE: Make sure your router is set up to get 'layoutId' from the body
    const { layoutId } = req.body; 
    if (!layoutId) {
        return res.status(400).json({ message: 'Layout ID is required.' });
    }

    try {
        // We must delete all related records in a transaction
        // See prisma/schema.prisma for all relations
        await prisma.$transaction(async (tx) => {
            // 1. Delete all CollaborationRequests for this layout
            await tx.collaborationRequest.deleteMany({
                where: { layoutId: layoutId },
            });

            // 2. Delete all LevelParts for this layout
            await tx.levelPart.deleteMany({
                where: { layoutId: layoutId },
            });

            // 3. Delete all LayoutReports for this layout
            await tx.layoutReport.deleteMany({
                where: { reportedLayoutId: layoutId },
            });

            // 4. Delete the Conversation for this layout (if it exists)
            //    This will also delete all Messages related to the conversation
            //    due to the relation in the Message model.
            await tx.conversation.deleteMany({
                where: { layoutId: layoutId },
            });

            // 5. Finally, delete the Layout itself
            await tx.layout.delete({
                where: { id: layoutId },
            });
        });

        return res.status(200).json({ message: 'Layout and all related data deleted successfully.' });

    } catch (error) {
        // Check if the error is the one we're trying to fix
        if (error.code === 'P2014') {
             console.error('P2014 Error: Still a relation violation.', error);
             return res.status(500).json({ message: 'Failed to delete layout due to a database relation conflict. Check server logs.' });
        }
        console.error('Delete layout error:', error);
        return res.status(500).json({ message: 'Failed to delete layout.' });
    }
}