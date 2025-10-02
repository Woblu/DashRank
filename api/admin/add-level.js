import { addLevelToList } from '../../src/server/listManagementHandlers.js';
import { verifyToken } from '../../src/server/authUtils.js';

/**
 * API route handler for adding a new level to a list.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const decodedToken = verifyToken(req.headers.authorization);

    // Permission Check: Ensure the user is an admin.
    if (!decodedToken || decodedToken.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }

    const { levelData, list, placement } = req.body;

    if (!levelData || !list || placement === undefined) {
      return res.status(400).json({ message: 'Missing required fields: levelData, list, or placement.' });
    }

    const newLevel = await addLevelToList(levelData, list, placement);
    return res.status(201).json(newLevel);

  } catch (error) {
    console.error("Error in /api/admin/add-level:", error);
    return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
}