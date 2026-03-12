const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { ForumCategory, ForumThread, ForumReply, User } = require('../models');

// List categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await ForumCategory.findAll({
      order: [['order_index', 'ASC']]
    });

    // Add thread count per category
    const result = await Promise.all(categories.map(async (cat) => {
      const threadCount = await ForumThread.count({ where: { category_id: cat.id } });
      const c = cat.toJSON();
      c.threadCount = threadCount;
      return c;
    }));

    res.json({ categories: result });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create category (admin only)
router.post('/categories', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin requis' });

    const { name, description, icon_url, order_index } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });

    const category = await ForumCategory.create({ name, description, icon_url, order_index: order_index || 0 });
    res.status(201).json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// List threads in category
router.get('/categories/:categoryId/threads', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: threads } = await ForumThread.findAndCountAll({
      where: { category_id: req.params.categoryId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ],
      order: [['is_pinned', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    // Add reply count
    const result = await Promise.all(threads.map(async (thread) => {
      const replyCount = await ForumReply.count({ where: { thread_id: thread.id } });
      const t = thread.toJSON();
      t.replyCount = replyCount;
      return t;
    }));

    res.json({ threads: result, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('List threads error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get thread with replies
router.get('/threads/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url', 'level'] },
        { model: ForumCategory, as: 'category' }
      ]
    });
    if (!thread) return res.status(404).json({ error: 'Discussion non trouvee' });

    // Increment view count
    await thread.increment('view_count');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: replies } = await ForumReply.findAndCountAll({
      where: { thread_id: thread.id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url', 'level'] }
      ],
      order: [['created_at', 'ASC']],
      limit,
      offset
    });

    res.json({
      thread,
      replies,
      totalReplies: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create thread
router.post('/categories/:categoryId/threads', authenticate, async (req, res) => {
  try {
    const category = await ForumCategory.findByPk(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Categorie non trouvee' });

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis' });

    const thread = await ForumThread.create({
      category_id: category.id,
      user_id: req.user.id,
      title,
      content
    });

    const fullThread = await ForumThread.findByPk(thread.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    res.status(201).json({ thread: fullThread });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Reply to thread
router.post('/threads/:id/replies', authenticate, async (req, res) => {
  try {
    const thread = await ForumThread.findByPk(req.params.id);
    if (!thread) return res.status(404).json({ error: 'Discussion non trouvee' });
    if (thread.is_locked) return res.status(403).json({ error: 'Discussion verrouillee' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Le contenu est requis' });

    const reply = await ForumReply.create({
      thread_id: thread.id,
      user_id: req.user.id,
      content
    });

    const fullReply = await ForumReply.findByPk(reply.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url', 'level'] }]
    });

    res.status(201).json({ reply: fullReply });
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete thread (author or admin)
router.delete('/threads/:id', authenticate, async (req, res) => {
  try {
    const thread = await ForumThread.findByPk(req.params.id);
    if (!thread) return res.status(404).json({ error: 'Discussion non trouvee' });
    if (thread.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    await thread.destroy();
    res.json({ message: 'Discussion supprimee' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete reply (author or admin)
router.delete('/replies/:id', authenticate, async (req, res) => {
  try {
    const reply = await ForumReply.findByPk(req.params.id);
    if (!reply) return res.status(404).json({ error: 'Reponse non trouvee' });
    if (reply.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    await reply.destroy();
    res.json({ message: 'Reponse supprimee' });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
