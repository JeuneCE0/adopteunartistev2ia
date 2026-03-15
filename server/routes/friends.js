const express = require('express');
const { Op } = require('sequelize');
const { User, Friendship } = require('../models');
const { authenticate } = require('../middleware/auth');
const { awardXP } = require('../services/gamification');
const { createNotification } = require('../socket/notifications');

const router = express.Router();

// GET /api/friends - Get my friends list
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const friendships = await Friendship.findAndCountAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requester_id: req.user.id }, { receiver_id: req.user.id }]
      },
      include: [
        { model: User, as: 'requester', attributes: { exclude: ['password_hash'] } },
        { model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const friends = friendships.rows.map(f => {
      return f.requester_id === req.user.id ? f.receiver : f.requester;
    });

    res.json({
      friends,
      total: friendships.count,
      page: parseInt(page),
      totalPages: Math.ceil(friendships.count / limit)
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/friends/requests - Get pending friend requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await Friendship.findAll({
      where: {
        receiver_id: req.user.id,
        status: 'pending'
      },
      include: [
        { model: User, as: 'requester', attributes: { exclude: ['password_hash'] } }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/friends/user/:userId - Get a user's friends
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    const userId = parseInt(req.params.userId);

    const friendships = await Friendship.findAndCountAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requester_id: userId }, { receiver_id: userId }]
      },
      include: [
        { model: User, as: 'requester', attributes: { exclude: ['password_hash'] } },
        { model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const friends = friendships.rows.map(f => {
      return f.requester_id === userId ? f.receiver : f.requester;
    });

    res.json({
      friends,
      total: friendships.count,
      page: parseInt(page),
      totalPages: Math.ceil(friendships.count / limit)
    });
  } catch (error) {
    console.error('Get user friends error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/friends/request/:userId - Send friend request
router.post('/request/:userId', authenticate, async (req, res) => {
  try {
    const receiverId = parseInt(req.params.userId);

    if (req.user.id === receiverId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-meme' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    // Check if friendship already exists
    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requester_id: req.user.id, receiver_id: receiverId },
          { requester_id: receiverId, receiver_id: req.user.id }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Vous etes deja amis' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Une demande est deja en attente' });
      }
      // If rejected, allow re-sending
      await existing.update({ requester_id: req.user.id, receiver_id: receiverId, status: 'pending' });
      return res.json({ message: 'Demande d\'ami envoyee', friendship: existing });
    }

    const friendship = await Friendship.create({
      requester_id: req.user.id,
      receiver_id: receiverId
    });

    // Notify the receiver
    const io = req.app.get('io');
    const userName = req.user.display_name || req.user.username;
    createNotification(io, {
      userId: receiverId,
      type: 'friend_request',
      title: 'Demande d\'ami',
      content: userName + ' vous a envoye une demande d\'ami',
      link: '/hub-profile-requests.html'
    }).catch(e => console.error('Notification error:', e));

    res.status(201).json({ message: 'Demande d\'ami envoyee', friendship });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/friends/accept/:requestId - Accept friend request
router.put('/accept/:requestId', authenticate, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.requestId);
    if (!friendship) {
      return res.status(404).json({ error: 'Demande non trouvee' });
    }
    if (friendship.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorise' });
    }
    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Cette demande a deja ete traitee' });
    }

    await friendship.update({ status: 'accepted' });

    // Gamification: award XP to both users
    const io = req.app.get('io');
    awardXP(req.user.id, 'friend_accept', io).catch(e => console.error('XP error:', e));
    awardXP(friendship.requester_id, 'friend_accept', io).catch(e => console.error('XP error:', e));

    // Notify the requester
    const userName = req.user.display_name || req.user.username;
    createNotification(io, {
      userId: friendship.requester_id,
      type: 'friend_accepted',
      title: 'Demande acceptee',
      content: userName + ' a accepte votre demande d\'ami',
      link: '/profile-timeline.html?id=' + req.user.id
    }).catch(e => console.error('Notification error:', e));

    res.json({ message: 'Demande acceptee', friendship });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/friends/reject/:requestId - Reject friend request
router.put('/reject/:requestId', authenticate, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.requestId);
    if (!friendship) {
      return res.status(404).json({ error: 'Demande non trouvee' });
    }
    if (friendship.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    await friendship.update({ status: 'rejected' });
    res.json({ message: 'Demande refusee' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/friends/:userId - Remove friend
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const friendId = parseInt(req.params.userId);
    const friendship = await Friendship.findOne({
      where: {
        status: 'accepted',
        [Op.or]: [
          { requester_id: req.user.id, receiver_id: friendId },
          { requester_id: friendId, receiver_id: req.user.id }
        ]
      }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Ami non trouve' });
    }

    await friendship.destroy();
    res.json({ message: 'Ami supprime' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
