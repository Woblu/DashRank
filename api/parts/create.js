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
    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token.' });
    }
    
    // The body needs to be parsed from the request stream
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            req.body = JSON.parse(body);
            await createPart(req, res, decodedToken);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid JSON body.' });
        }
    });

  } catch (error) {
    return res.status(401).json({ message: error.message || 'Unauthorized.' });
  }
}