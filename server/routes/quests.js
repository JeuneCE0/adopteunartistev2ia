const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Quest, UserQuest, Badge } = require('../models');

// List all quests
router.get('/', async (req, res) => {
  try {
    const quests = await Quest.findAll({
      include: [{ model: Badge, as: 'badgeReward' }],
      order: [['type', 'ASC']]
    });
    res.json({ quests });
  } catch (error) {
    console.error('List quests error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my quests with progress
router.get('/my-quests', authenticate, async (req, res) => {
  try {
    const userQuests = await UserQuest.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Quest,
        as: 'quest',
        include: [{ model: Badge, as: 'badgeReward' }]
      }]
    });
    res.json({ quests: userQuests });
  } catch (error) {
    console.error('My quests error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Start a quest
router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const quest = await Quest.findByPk(req.params.id);
    if (!quest) return res.status(404).json({ error: 'Quete non trouvee' });

    const existing = await UserQuest.findOne({
      where: { user_id: req.user.id, quest_id: quest.id }
    });
    if (existing) return res.status(400).json({ error: 'Quete deja commencee' });

    const userQuest = await UserQuest.create({
      user_id: req.user.id,
      quest_id: quest.id,
      progress: 0,
      status: 'active'
    });

    res.status(201).json({ userQuest });
  } catch (error) {
    console.error('Start quest error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create quest (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });

    const { title, description, type, requirement_type, requirement_value, xp_reward, badge_reward_id, cover_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Le titre est requis' });

    const quest = await Quest.create({
      title, description,
      type: type || 'one_time',
      requirement_type, requirement_value: requirement_value || 1,
      xp_reward: xp_reward || 0,
      badge_reward_id, cover_url
    });

    res.status(201).json({ quest });
  } catch (error) {
    console.error('Create quest error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
