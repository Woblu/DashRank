import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a new collaboration request for a layout.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function applyToLayout(req, res, decodedToken) {
  const { layoutId, message } = req.body;
  const applicantId = decodedToken.userId;

  if (!layoutId) {
    return res.status(400).json({ message: 'Layout ID is required.' });
  }

  try {
    const layout = await prisma.layout.findUnique({
      where: { id: layoutId },
    });

    if (!layout) {
      return res.status(404).json({ message: 'Layout not found.' });
    }

    if (layout.creatorId === applicantId) {
      return res.status(400).json({ message: 'You cannot apply to your own layout.' });
    }

    const newRequest = await prisma.collaborationRequest.create({
      data: {
        message,
        applicantId,
        layoutId,
        status: 'PENDING',
      },
    });

    return res.status(201).json(newRequest);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'You have already applied to this layout.' });
    }
    console.error("Failed to create collaboration request:", error);
    return res.status(500).json({ message: 'Failed to submit application.' });
  }
}

/**
 * Fetches all pending applicants for a specific layout.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {string} layoutId The ID of the layout.
 */
export async function listLayoutApplicants(req, res, layoutId) {
    try {
        const applicants = await prisma.collaborationRequest.findMany({
            where: {
                layoutId: layoutId,
                status: 'PENDING',
            },
            include: {
                applicant: {
                    select: { id: true, username: true },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return res.status(200).json(applicants);
    } catch (error) {
        console.error("Failed to list layout applicants:", error);
        return res.status(500).json({ message: 'Failed to fetch applicants.' });
    }
}

/**
 * Updates the status of a collaboration request.
 * Only the layout creator can perform this action.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function updateApplicationStatus(req, res, decodedToken) {
  const { requestId, status } = req.body; // status should be 'ACCEPTED' or 'REJECTED'
  const creatorId = decodedToken.userId;

  if (!requestId || !status) {
    return res.status(400).json({ message: 'Request ID and status are required.' });
  }

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    const request = await prisma.collaborationRequest.findUnique({
      where: { id: requestId },
      include: { layout: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (request.layout.creatorId !== creatorId) {
      return res.status(403).json({ message: 'You are not authorized to manage this layout.' });
    }

    // Use a transaction to ensure atomicity
    const transaction = [];

    // 1. Update the request status
    transaction.push(
      prisma.collaborationRequest.update({
        where: { id: requestId },
        data: { status },
      })
    );

    // 2. If accepted, add user to the conversation and change layout status
    if (status === 'ACCEPTED') {
      // Create conversation if it doesn't exist
      await prisma.conversation.upsert({
        where: { layoutId: request.layoutId },
        update: {
          members: {
            connect: [{ id: request.applicantId }],
          },
        },
        create: {
          layoutId: request.layoutId,
          members: {
            connect: [
              { id: request.layout.creatorId },
              { id: request.applicantId },
            ],
          },
        },
      });

      // Change layout status to IN_PROGRESS if it's currently OPEN
      if (request.layout.status === 'OPEN') {
        transaction.push(
          prisma.layout.update({
            where: { id: request.layoutId },
            data: { status: 'IN_PROGRESS' },
          })
        );
      }
    }

    await prisma.$transaction(transaction);

    return res.status(200).json({ message: `Application ${status.toLowerCase()}.` });
  } catch (error) {
    console.error('Failed to update application status:', error);
    return res.status(500).json({ message: 'Failed to update application status.' });
  }
}