// src/server/submissionHandlers.js
import { PrismaClient } from '@prisma/client';
import { cleanUsername } from '../utils/scoring.js';

const prisma = new PrismaClient();

/**
 * Creates a new submission for the moderation queue.
 */
export async function createSubmission(req, res, decodedToken) {
  const { levelName, player, percent, videoId, rawFootageLink, notes } = req.body;
  const { userId, username, role } = decodedToken;

  // --- Validation ---
  if (!levelName || !player || !percent || !videoId || !rawFootageLink) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  // Admin/Mod check: If the 'player' field is different from their own username,
  // they must be an admin or moderator.
  if (cleanUsername(player) !== cleanUsername(username) && role !== 'ADMIN' && role !== 'MODERATOR') {
    return res.status(403).json({ message: 'You are not authorized to submit records for other players.' });
  }

  try {
    // --- Check for an existing level ---
    // We check against the `name` field in the `Level` model
    const level = await prisma.level.findFirst({
      where: { name: { equals: levelName, mode: 'insensitive' } },
      select: { id: true, name: true }
    });

    if (!level) {
      return res.status(404).json({ message: `Level "${levelName}" not found on the demon list. Please check the spelling.` });
    }

    // --- Create the submission ---
    const newSubmission = await prisma.submission.create({
      data: {
        levelName: level.name, // Use the canonical level name
        player: player, // Use the name from the form (which might be for someone else if admin)
        percent: Number(percent),
        videoId: videoId,
        rawFootageLink: rawFootageLink,
        notes: notes || '',
        status: 'PENDING',
        submittedById: userId, // Link to the user who submitted it
      },
    });

    console.log(`[SubmissionHandler] New submission created for ${levelName} by ${player}`);
    return res.status(201).json({ message: 'Record submitted for review successfully!' });

  } catch (error) {
    console.error("Failed to create submission:", error);
    return res.status(500).json({ message: 'An error occurred while creating the submission.' });
  }
}