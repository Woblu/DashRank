import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fetches conversation history for a given layout.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {string} layoutId The ID of the layout.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function getConversationHistory(req, res, layoutId, decodedToken) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { layoutId: layoutId },
      include: {
        members: { select: { id: true } },
        messages: {
          include: {
            author: { select: { id: true, username: true } },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      // It's not an error if a convo hasn't started. Just return empty.
      return res.status(200).json({ messages: [], conversationId: null });
    }

    // Security check: ensure the user is part of this conversation
    const isUserInConversation = conversation.members.some(member => member.id === decodedToken.userId);
    if (!isUserInConversation) {
      return res.status(403).json({ message: 'You are not authorized to view this chat.' });
    }

    return res.status(200).json({
      messages: conversation.messages,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('Failed to fetch conversation history:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}


/**
 * Posts a new message to a conversation.
 * NOTE: This is for a RESTful approach. Real-time chat will use WebSockets.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 * @param {object} decodedToken The verified JWT payload.
 */
export async function postMessage(req, res, decodedToken) {
  const { conversationId, content } = req.body;
  const authorId = decodedToken.userId;

  if (!conversationId || !content) {
    return res.status(400).json({ message: 'Conversation ID and content are required.' });
  }

  try {
    // Security check: ensure the user is part of this conversation before allowing them to post.
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            members: { some: { id: authorId } }
        }
    });

    if (!conversation) {
        return res.status(403).json({ message: 'You are not authorized to post in this chat.' });
    }

    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        authorId,
        content,
      },
      include: {
        author: { select: { id: true, username: true } },
      },
    });
    
    // In a WebSocket setup, you would now broadcast this `newMessage` object
    // to all other clients in the conversation's room.

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Failed to post message:', error);
    return res.status(500).json({ message: 'Failed to post message.' });
  }
}