import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API route handler for fetching all levels from a specific list.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // The file name [listType].js means the dynamic part of the URL
  // will be available in the query object.
  const { listType } = req.query;

  if (!listType) {
    return res.status(400).json({ message: 'List type parameter is missing.' });
  }

  try {
    const levels = await prisma.level.findMany({
      where: {
        list: listType,
      },
      orderBy: {
        placement: 'asc',
      },
    });

    return res.status(200).json(levels);
  } catch (error) {
    console.error(`Failed to fetch levels for list "${listType}":`, error);
    return res.status(500).json({ message: 'An internal server error occurred while fetching the list.' });
  }
}