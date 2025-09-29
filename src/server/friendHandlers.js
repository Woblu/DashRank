import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches the user's friend list or incoming friend requests.
 * Differentiates based on the 'filter' query parameter.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function listFriends(req, res, decodedToken) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filter = url.searchParams.get('filter');
  const userId = decodedToken.userId;

  try {
    if (filter === 'requests') {
      const requests = await prisma.friendship.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: { requester: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(requests);
    }

    // Default action is to list accepted friends
    const friendships = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
      include: {
        requester: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });
    const friends = friendships.map(f => f.requesterId === userId ? f.receiver : f.requester);
    return res.status(200).json(friends);
  } catch (error) {
    console.error("Failed to fetch friends data:", error);
    return res.status(500).json({ message: 'Failed to fetch data.' });
  }
}

/**
 * Creates a new, pending friend request.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function sendFriendRequest(req, res, decodedToken) {
  const { receiverId } = req.body;
  const requesterId = decodedToken.userId;

  if (!receiverId) return res.status(400).json({ message: 'Receiver ID is required.' });
  if (requesterId === receiverId) return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });

  try {
    const existing = await prisma.friendship.findFirst({ where: { OR: [{ requesterId, receiverId }, { requesterId: receiverId, receiverId: requesterId }] } });
    
    if (existing && existing.status !== 'DECLINED') {
      return res.status(400).json({ message: `A friendship or pending request already exists.` });
    }
    
    if (existing && existing.status === 'DECLINED') {
      await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'PENDING', requesterId, receiverId }
      });
    } else {
      await prisma.friendship.create({ data: { requesterId, receiverId, status: 'PENDING' } });
    }

    return res.status(201).json({ message: 'Friend request sent.' });
  } catch (error) {
    console.error("Failed to send friend request:", error);
    return res.status(500).json({ message: 'Failed to send friend request.' });
  }
}

/**
 * Responds to a pending friend request (accepts or declines).
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function respondToFriendRequest(req, res, decodedToken) {
  const { friendshipId, response } = req.body;
  if (!friendshipId || !['ACCEPTED', 'DECLINED'].includes(response)) {
    return res.status(400).json({ message: 'Friendship ID and a valid response are required.' });
  }
  
  try {
    const friendship = await prisma.friendship.findFirst({ where: { id: friendshipId, receiverId: decodedToken.userId } });
    if (!friendship) return res.status(403).json({ message: 'Request not found or you do not have permission to respond.' });
    if (friendship.status !== 'PENDING') return res.status(400).json({ message: 'This request is no longer pending.' });

    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: response } });
    return res.status(200).json({ message: `Friend request has been ${response.toLowerCase()}.` });
  } catch (error) {
    console.error("Failed to respond to friend request:", error);
    return res.status(500).json({ message: 'Failed to respond to friend request.' });
  }
}