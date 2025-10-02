import { createPart } from '../../src/server/partHandlers.js';
import { verifyToken } from '../../src/server/authUtils.js';

/**
 * API route handler for creating a new level part.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // ** THE FIX IS HERE **
    // We now correctly pass the header string, not the whole req object.
    const decodedToken = verifyToken(req.headers.authorization);

    if (!decodedToken) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token.' });
    }
    
    // Most serverless environments automatically parse the body, so req.body should be available.
    if (!req.body) {
        return res.status(400).json({ message: 'Missing request body.' });
    }

    await createPart(req, res, decodedToken);

  } catch (error) {
    console.error("Error in /api/parts/create:", error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
}