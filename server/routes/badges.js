const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Badge, UserBadge, User } = require('../models');

// List all badges
router.get('/', async (req, res) => {
  try {
    const badges = await Badge.findAll({ order: [['category', 'ASC'], ['requirement_value', 'ASC']] });
    res.json({ badges });
  } catch (error) {
    console.error('List badges error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get user's badges
router.get('/user/:userId', async (req, res) => {
  try {
    const userBadges = await UserBadge.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: Badge, as: 'badge' }]
    });
    res.json({ badges: userBadges });
  } catch (error) {
    console.error('User badges error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create badge (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });

    const { name, description, icon_url, category, requirement_type, requirement_value, xp_reward } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });

    const badge = await Badge.create({
      name, description, icon_url, category,
      requirement_type, requirement_value: requirement_value || 0,
      xp_reward: xp_reward || 0
    });

    res.status(201).json({ badge });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
