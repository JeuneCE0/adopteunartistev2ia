const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { User, ConversationParticipant } = require('../models');

module.exports = function setupChat(io) {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`User ${socket.user.username} connected (socket: ${socket.id})`);

    // Join user's personal room for notifications
    socket.join(`user_${userId}`);

    // Update online status
    await User.update({ is_online: true }, { where: { id: userId } });
    io.emit('user_online', { userId, username: socket.user.username });

    // Join all user's conversations
    const participations = await ConversationParticipant.findAll({
      where: { user_id: userId }
    });
    participations.forEach(p => {
      socket.join(`conversation_${p.conversation_id}`);
    });

    // Join a specific conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId,
        username: socket.user.username,
        conversationId: data.conversationId
      });
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId: data.conversationId
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      await User.update({ is_online: false, last_seen: new Date() }, { where: { id: userId } });
      io.emit('user_offline', { userId, username: socket.user.username });
    });
  });
};
