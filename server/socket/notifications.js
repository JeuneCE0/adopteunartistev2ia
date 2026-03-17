const { Notification } = require('../models');

// Helper to create and send a notification in real-time
async function createNotification(io, { userId, type, title, content, link }) {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    content,
    link
  });

  if (io) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }

  return notification;
}

module.exports = { createNotification };
