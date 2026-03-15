const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Stream, User } = require('../models');
const { Op } = require('sequelize');

// List streams
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const { count, rows: streams } = await Stream.findAndCountAll({
      where,
      include: [
        { model: User, as: 'streamer', attributes: ['id', 'username', 'display_name', 'avatar_url', 'level'] }
      ],
      order: [
        ['status', 'ASC'], // live first
        ['started_at', 'DESC']
      ],
      limit,
      offset
    });

    res.json({ streams, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('List streams error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get stream
router.get('/:id', async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id, {
      include: [
        { model: User, as: 'streamer', attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio', 'level'] }
      ]
    });
    if (!stream) return res.status(404).json({ error: 'Stream non trouve' });
    res.json({ stream });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create/schedule stream
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, stream_url, thumbnail_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Le titre est requis' });

    const stream = await Stream.create({
      user_id: req.user.id,
      title,
      description,
      stream_url,
      thumbnail_url,
      status: 'scheduled'
    });

    res.status(201).json({ stream });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Start stream (go live)
router.put('/:id/start', authenticate, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ error: 'Stream non trouve' });
    if (stream.user_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await stream.update({ status: 'live', started_at: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.emit('stream_started', { streamId: stream.id, title: stream.title, streamer: req.user.username });
    }

    res.json({ stream });
  } catch (error) {
    console.error('Start stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// End stream
router.put('/:id/end', authenticate, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ error: 'Stream non trouve' });
    if (stream.user_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await stream.update({ status: 'ended', ended_at: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.emit('stream_ended', { streamId: stream.id });
    }

    res.json({ stream });
  } catch (error) {
    console.error('End stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete stream
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const stream = await Stream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ error: 'Stream non trouve' });
    if (stream.user_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await stream.destroy();
    res.json({ message: 'Stream supprime' });
  } catch (error) {
    console.error('Delete stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
