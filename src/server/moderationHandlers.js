import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a new report for a layout.
 */
export async function createLayoutReport(req, res, decodedToken) {
  const { layoutId, reason } = req.body;
  const reporterId = decodedToken.userId;

  if (!layoutId || !reason) {
    return res.status(400).json({ message: 'Layout ID and a reason are required to file a report.' });
  }

  try {
    const existingReport = await prisma.layoutReport.findFirst({
      where: { reportedLayoutId: layoutId, reporterId: reporterId },
    });

    if (existingReport) {
      return res.status(409).json({ message: 'You have already reported this layout.' });
    }

    await prisma.layoutReport.create({
      data: {
        reason,
        reportedLayoutId: layoutId,
        reporterId: reporterId,
        status: 'PENDING',
      },
    });

    return res.status(201).json({ message: 'Report submitted successfully. Our moderators will review it shortly.' });
  } catch (error) {
    console.error("Failed to create layout report:", error);
    return res.status(500).json({ message: 'Failed to submit report.' });
  }
}

/**
 * Fetches all pending layout reports for the admin panel.
 */
export async function listLayoutReports(req, res) {
  try {
    const reports = await prisma.layoutReport.findMany({
      where: { status: 'PENDING' },
      include: {
        reportedLayout: {
          include: { creator: { select: { id: true, username: true } } },
        },
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Failed to fetch layout reports:", error);
    return res.status(500).json({ message: 'Failed to fetch layout reports.' });
  }
}

/**
 * Updates the status of a layout report (e.g., to RESOLVED).
 */
export async function updateReportStatus(req, res) {
    const { reportId, status } = req.body;

    if (!reportId || !status) {
        return res.status(400).json({ message: 'Report ID and new status are required.' });
    }
    
    try {
        await prisma.layoutReport.update({
            where: { id: reportId },
            data: { status: status },
        });
        return res.status(200).json({ message: `Report status updated to ${status}.` });
    } catch (error) {
        console.error("Failed to update report status:", error);
        return res.status(500).json({ message: 'Failed to update report status.' });
    }
}

/**
 * Bans a user from the Creator's Workshop.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
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
        return res.status(200).json({ message: 'User has been banned from the Creator\'s Workshop.' });
    } catch (error) {
        console.error("Failed to ban user:", error);
        return res.status(500).json({ message: 'Failed to ban user.' });
    }
}