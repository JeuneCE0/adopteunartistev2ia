const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { SubscriptionTier, Subscription, ArtistEarning, User } = require('../models');
const { Op } = require('sequelize');

// Get artist's tiers
router.get('/tiers/:artistId', async (req, res) => {
  try {
    const tiers = await SubscriptionTier.findAll({
      where: { artist_id: req.params.artistId },
      order: [['price', 'ASC']]
    });

    const result = await Promise.all(tiers.map(async (tier) => {
      const subscriberCount = await Subscription.count({
        where: { tier_id: tier.id, status: 'active' }
      });
      const t = tier.toJSON();
      t.subscriberCount = subscriberCount;
      return t;
    }));

    res.json({ tiers: result });
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create tier (artist only)
router.post('/tiers', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'artist' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls les artistes peuvent creer des paliers' });
    }

    const { name, description, price, benefits } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nom et prix requis' });

    const tier = await SubscriptionTier.create({
      artist_id: req.user.id,
      name,
      description,
      price: parseFloat(price),
      benefits: benefits ? JSON.stringify(benefits) : null
    });

    res.status(201).json({ tier });
  } catch (error) {
    console.error('Create tier error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update tier
router.put('/tiers/:id', authenticate, async (req, res) => {
  try {
    const tier = await SubscriptionTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Palier non trouve' });
    if (tier.artist_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    const { name, description, price, benefits } = req.body;
    await tier.update({
      name: name || tier.name,
      description,
      price: price ? parseFloat(price) : tier.price,
      benefits: benefits ? JSON.stringify(benefits) : tier.benefits
    });

    res.json({ tier });
  } catch (error) {
    console.error('Update tier error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete tier
router.delete('/tiers/:id', authenticate, async (req, res) => {
  try {
    const tier = await SubscriptionTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Palier non trouve' });
    if (tier.artist_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await tier.destroy();
    res.json({ message: 'Palier supprime' });
  } catch (error) {
    console.error('Delete tier error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Subscribe to a tier
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { tierId } = req.body;
    const tier = await SubscriptionTier.findByPk(tierId);
    if (!tier) return res.status(404).json({ error: 'Palier non trouve' });

    // Check if already subscribed to this artist
    const existing = await Subscription.findOne({
      where: { subscriber_id: req.user.id, artist_id: tier.artist_id, status: 'active' }
    });
    if (existing) {
      // Change tier
      await existing.update({ tier_id: tierId });
      return res.json({ subscription: existing, message: 'Palier mis a jour' });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await Subscription.create({
      subscriber_id: req.user.id,
      tier_id: tierId,
      artist_id: tier.artist_id,
      status: 'active',
      current_period_start: now,
      current_period_end: periodEnd
    });

    // Record earning
    await ArtistEarning.create({
      artist_id: tier.artist_id,
      amount: tier.price,
      type: 'subscription',
      source_id: subscription.id
    });

    res.status(201).json({ subscription });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Unsubscribe
router.post('/unsubscribe/:artistId', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { subscriber_id: req.user.id, artist_id: req.params.artistId, status: 'active' }
    });
    if (!subscription) return res.status(404).json({ error: 'Abonnement non trouve' });

    await subscription.update({ status: 'cancelled' });
    res.json({ message: 'Abonnement annule' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my subscriptions
router.get('/my-subscriptions', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { subscriber_id: req.user.id, status: 'active' },
      include: [
        { model: SubscriptionTier, as: 'tier' },
        { model: User, as: 'artist', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ]
    });
    res.json({ subscriptions });
  } catch (error) {
    console.error('My subscriptions error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my supporters (for artists)
router.get('/my-supporters', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { artist_id: req.user.id, status: 'active' },
      include: [
        { model: SubscriptionTier, as: 'tier' },
        { model: User, as: 'subscriber', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ]
    });
    res.json({ supporters: subscriptions });
  } catch (error) {
    console.error('My supporters error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get earnings dashboard
router.get('/earnings', authenticate, async (req, res) => {
  try {
    const earnings = await ArtistEarning.findAll({
      where: { artist_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    const totalEarnings = await ArtistEarning.sum('amount', {
      where: { artist_id: req.user.id }
    });

    const monthlyEarnings = await ArtistEarning.sum('amount', {
      where: {
        artist_id: req.user.id,
        created_at: { [Op.gte]: new Date(new Date().setDate(1)) }
      }
    });

    res.json({
      earnings,
      totalEarnings: totalEarnings || 0,
      monthlyEarnings: monthlyEarnings || 0
    });
  } catch (error) {
    console.error('Earnings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
