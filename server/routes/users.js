const express = require('express');
const { Op } = require('sequelize');
const { User, Post, Friendship } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/users - Search/list members
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { display_name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) {
      where.role = role;
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/users/:id - User profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    // Count posts and friends
    const postCount = await Post.count({ where: { user_id: user.id } });
    const friendCount = await Friendship.count({
      where: {
        status: 'accepted',
        [Op.or]: [{ requester_id: user.id }, { receiver_id: user.id }]
      }
    });

    // Check friendship status if logged in
    let friendshipStatus = null;
    if (req.user && req.user.id !== user.id) {
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { requester_id: req.user.id, receiver_id: user.id },
            { requester_id: user.id, receiver_id: req.user.id }
          ]
        }
      });
      if (friendship) {
        friendshipStatus = {
          id: friendship.id,
          status: friendship.status,
          isSender: friendship.requester_id === req.user.id
        };
      }
    }

    res.json({
      user: user.toJSON(),
      stats: { postCount, friendCount },
      friendshipStatus
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/users/:id - Update profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    const allowedFields = ['display_name', 'bio', 'country', 'city', 'birthday', 'role'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await req.user.update(updates);
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/users/:id/avatar - Upload avatar
router.post('/:id/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoye' });
    }

    const avatar_url = 'uploads/' + req.file.filename;
    await req.user.update({ avatar_url });
    res.json({ avatar_url, user: req.user.toJSON() });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/users/:id/cover - Upload cover
router.post('/:id/cover', authenticate, upload.single('cover'), async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoye' });
    }

    const cover_url = 'uploads/' + req.file.filename;
    await req.user.update({ cover_url });
    res.json({ cover_url, user: req.user.toJSON() });
  } catch (error) {
    console.error('Upload cover error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
