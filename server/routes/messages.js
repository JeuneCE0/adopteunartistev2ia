const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Conversation, ConversationParticipant, Message, User } = require('../models');
const { Op } = require('sequelize');

// Get all conversations for current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'display_name', 'avatar_url', 'is_online'],
          through: { attributes: ['last_read_at'] }
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'display_name'] }]
        }
      ],
      where: {
        id: {
          [Op.in]: Conversation.sequelize.literal(
            `(SELECT conversation_id FROM conversation_participants WHERE user_id = ${req.user.id})`
          )
        }
      },
      order: [['updated_at', 'DESC']]
    });

    // Add unread count for each conversation
    const result = await Promise.all(conversations.map(async (conv) => {
      const participant = await ConversationParticipant.findOne({
        where: { conversation_id: conv.id, user_id: req.user.id }
      });
      const unreadCount = await Message.count({
        where: {
          conversation_id: conv.id,
          sender_id: { [Op.ne]: req.user.id },
          created_at: { [Op.gt]: participant.last_read_at || new Date(0) }
        }
      });
      const convJSON = conv.toJSON();
      convJSON.unreadCount = unreadCount;
      convJSON.lastMessage = convJSON.messages[0] || null;
      delete convJSON.messages;
      return convJSON;
    }));

    res.json({ conversations: result });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create or get existing private conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { userId, type = 'private' } = req.body;

    if (type === 'private' && userId) {
      // Check if private conversation already exists between these two users
      const existing = await Conversation.sequelize.query(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = :userId1
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = :userId2
        WHERE c.type = 'private'
        LIMIT 1
      `, {
        replacements: { userId1: req.user.id, userId2: userId },
        type: Conversation.sequelize.QueryTypes.SELECT
      });

      if (existing.length > 0) {
        const conv = await Conversation.findByPk(existing[0].id, {
          include: [{
            model: User,
            as: 'participants',
            attributes: ['id', 'username', 'display_name', 'avatar_url', 'is_online']
          }]
        });
        return res.json({ conversation: conv });
      }
    }

    // Create new conversation
    const conversation = await Conversation.create({ type });

    // Add participants
    await ConversationParticipant.create({
      conversation_id: conversation.id,
      user_id: req.user.id,
      last_read_at: new Date()
    });

    if (userId) {
      await ConversationParticipant.create({
        conversation_id: conversation.id,
        user_id: userId,
        last_read_at: new Date()
      });
    }

    const fullConv = await Conversation.findByPk(conversation.id, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'is_online']
      }]
    });

    res.status(201).json({ conversation: fullConv });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Verify user is participant
    const participant = await ConversationParticipant.findOne({
      where: { conversation_id: id, user_id: req.user.id }
    });
    if (!participant) {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    const { count, rows: messages } = await Message.findAndCountAll({
      where: { conversation_id: id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Mark as read
    await participant.update({ last_read_at: new Date() });

    res.json({
      messages: messages.reverse(),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Send message
router.post('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le message ne peut pas etre vide' });
    }

    // Verify user is participant
    const participant = await ConversationParticipant.findOne({
      where: { conversation_id: id, user_id: req.user.id }
    });
    if (!participant) {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    const message = await Message.create({
      conversation_id: id,
      sender_id: req.user.id,
      content: content.trim(),
      type
    });

    // Update conversation timestamp
    await Conversation.update({ updated_at: new Date() }, { where: { id } });

    // Update sender's last_read_at
    await participant.update({ last_read_at: new Date() });

    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${id}`).emit('new_message', fullMessage);

      // Notify other participants
      const participants = await ConversationParticipant.findAll({
        where: { conversation_id: id, user_id: { [Op.ne]: req.user.id } }
      });
      participants.forEach(p => {
        io.to(`user_${p.user_id}`).emit('message_notification', {
          conversation_id: parseInt(id),
          message: fullMessage
        });
      });
    }

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
