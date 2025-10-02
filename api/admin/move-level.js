import { moveLevelInList } from '../../src/server/listManagementHandlers.js';
import { verifyToken } from '../../src/server/authUtils.js';

/**
 * API route handler for moving a level to a new placement in a list.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const decodedToken = verifyToken(req.headers.authorization);

    // Permission Check: Ensure the user is an admin.
    if (!decodedToken || decodedToken.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }

    const { levelId, newPlacement } = req.body;

    if (!levelId || newPlacement === undefined) {
      return res.status(400).json({ message: 'Missing required fields: levelId or newPlacement.' });
    }

    const updatedLevel = await moveLevelInList(levelId, newPlacement);
    return res.status(200).json(updatedLevel);

  } catch (error) {
    console.error("Error in /api/admin/move-level:", error);
    return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
}