const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
const setupChat = require('./socket/chat');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io - chat & notifications (local dev only)
setupChat(io);

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');

    await sequelize.sync({ alter: true });
    console.log('Database synced');

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Periodic subscription expiry check (every 6 hours)
    const { Subscription, SubscriptionTier, ArtistEarning } = require('./models');
    const { Op } = require('sequelize');
    setInterval(async () => {
      try {
        const expired = await Subscription.findAll({
          where: { status: 'active', current_period_end: { [Op.lt]: new Date() } },
          include: [{ model: SubscriptionTier, as: 'tier' }]
        });
        for (const sub of expired) {
          const now = new Date();
          const newEnd = new Date(now);
          newEnd.setMonth(newEnd.getMonth() + 1);
          await sub.update({ current_period_start: now, current_period_end: newEnd });
          if (sub.tier) {
            await ArtistEarning.create({
              artist_id: sub.artist_id, amount: sub.tier.price,
              type: 'subscription_renewal', source_id: sub.id
            }).catch(() => {});
          }
        }
        if (expired.length > 0) console.log(`Auto-renewed ${expired.length} subscriptions`);
      } catch (e) { console.error('Subscription check error:', e.message); }
    }, 6 * 60 * 60 * 1000); // 6 hours
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
