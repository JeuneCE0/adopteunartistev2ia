require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const { sanitizeInput, validatePagination } = require('./middleware/validation');

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Trop de requetes, reessayez plus tard' }
});
app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives, reessayez plus tard' }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and pagination validation
app.use(sanitizeInput);
app.use(validatePagination);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Database initialization (once at cold start for serverless)
let dbReady = false;
app.use(async (req, res, next) => {
  if (!dbReady && req.path.startsWith('/api/')) {
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      dbReady = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/posts', require('./routes/reactions'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/forums', require('./routes/forums'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/events', require('./routes/events'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/quests', require('./routes/quests'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/streams', require('./routes/streams'));

// Temporary seed endpoint - creates demo account and syncs DB
const bcrypt = require('bcryptjs');
app.get('/api/seed-demo', async (req, res) => {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ where: { email: 'demo@adopteunartiste.com' } });
    if (existing) {
      return res.json({ message: 'Demo user already exists', username: existing.username });
    }
    const password_hash = await bcrypt.hash('Demo1234!', 10);
    const user = await User.create({
      username: 'demo_artiste',
      email: 'demo@adopteunartiste.com',
      password_hash,
      role: 'artist',
      display_name: 'Artiste Demo',
      bio: 'Compte de demonstration - Bienvenue sur Adopte un Artiste !',
      level: 5,
      xp: 450,
      is_online: false
    });
    res.json({ message: 'Demo account created', username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all: serve index.html for non-API routes that don't match a static file
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route API non trouvee' });
  }
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

module.exports = app;
