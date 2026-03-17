const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { recommendArtists, recommendPosts, recommendProducts, recommendEvents } = require('../services/recommendation');
const { UserInterest } = require('../models');

// Get recommended artists
router.get('/artists', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const artists = await recommendArtists(req.user.id, limit);
    res.json({ artists });
  } catch (error) {
    console.error('Recommend artists error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get recommended posts
router.get('/posts', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await recommendPosts(req.user.id, limit);
    res.json({ posts });
  } catch (error) {
    console.error('Recommend posts error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get recommended products
router.get('/products', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await recommendProducts(req.user.id, limit);
    res.json({ products });
  } catch (error) {
    console.error('Recommend products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get recommended events
router.get('/events', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await recommendEvents(req.user.id, limit);
    res.json({ events });
  } catch (error) {
    console.error('Recommend events error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Manage user interests
router.get('/interests', authenticate, async (req, res) => {
  try {
    const interests = await UserInterest.findAll({ where: { user_id: req.user.id } });
    res.json({ interests });
  } catch (error) {
    console.error('Get interests error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/interests', authenticate, async (req, res) => {
  try {
    const { tags } = req.body;
    if (!tags || !Array.isArray(tags)) return res.status(400).json({ error: 'Tags requis' });

    // Clear existing and replace
    await UserInterest.destroy({ where: { user_id: req.user.id } });

    const interests = await Promise.all(tags.map(tag =>
      UserInterest.create({ user_id: req.user.id, tag, weight: 1.0 })
    ));

    res.json({ interests });
  } catch (error) {
    console.error('Set interests error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
