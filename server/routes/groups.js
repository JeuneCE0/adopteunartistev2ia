const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Group, GroupMember, User, Post } = require('../models');
const { Op } = require('sequelize');
const upload = require('../middleware/upload');

// List all groups (public + user's private groups)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = { type: { [Op.ne]: 'secret' } };
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: groups } = await Group.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Add member count
    const result = await Promise.all(groups.map(async (group) => {
      const memberCount = await GroupMember.count({ where: { group_id: group.id } });
      const g = group.toJSON();
      g.memberCount = memberCount;
      if (req.user) {
        const membership = await GroupMember.findOne({
          where: { group_id: group.id, user_id: req.user.id }
        });
        g.isMember = !!membership;
        g.memberRole = membership ? membership.role : null;
      }
      return g;
    }));

    res.json({ groups: result, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get groups for a specific user
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const memberships = await GroupMember.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: Group,
        include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
      }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    const groups = await Promise.all(memberships.rows.map(async (m) => {
      const g = m.Group.toJSON();
      g.memberCount = await GroupMember.count({ where: { group_id: g.id } });
      if (req.user) {
        const membership = await GroupMember.findOne({ where: { group_id: g.id, user_id: req.user.id } });
        g.isMember = !!membership;
      }
      return g;
    }));

    res.json({ groups, total: memberships.count, page, totalPages: Math.ceil(memberships.count / limit) });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get group by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ]
    });
    if (!group) return res.status(404).json({ error: 'Groupe non trouve' });

    const memberCount = await GroupMember.count({ where: { group_id: group.id } });
    const result = group.toJSON();
    result.memberCount = memberCount;

    if (req.user) {
      const membership = await GroupMember.findOne({
        where: { group_id: group.id, user_id: req.user.id }
      });
      result.isMember = !!membership;
      result.memberRole = membership ? membership.role : null;
    }

    res.json({ group: result });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create group
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });

    const group = await Group.create({
      name,
      description,
      type: type || 'public',
      creator_id: req.user.id
    });

    // Creator becomes admin member
    await GroupMember.create({
      group_id: group.id,
      user_id: req.user.id,
      role: 'admin'
    });

    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update group
router.put('/:id', authenticate, async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Groupe non trouve' });

    const membership = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id, role: 'admin' }
    });
    if (!membership) return res.status(403).json({ error: 'Acces refuse' });

    const { name, description, type } = req.body;
    await group.update({ name: name || group.name, description, type: type || group.type });

    res.json({ group });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete group
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Groupe non trouve' });
    if (group.creator_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await group.destroy();
    res.json({ message: 'Groupe supprime' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Join group
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Groupe non trouve' });

    const existing = await GroupMember.findOne({
      where: { group_id: group.id, user_id: req.user.id }
    });
    if (existing) return res.status(400).json({ error: 'Deja membre' });

    await GroupMember.create({
      group_id: group.id,
      user_id: req.user.id,
      role: 'member'
    });

    res.json({ message: 'Rejoint le groupe' });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Leave group
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const member = await GroupMember.findOne({
      where: { group_id: req.params.id, user_id: req.user.id }
    });
    if (!member) return res.status(400).json({ error: 'Non membre' });

    await member.destroy();
    res.json({ message: 'Quitte le groupe' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get group members
router.get('/:id/members', async (req, res) => {
  try {
    const members = await GroupMember.findAll({
      where: { group_id: req.params.id },
      include: [{ model: User, attributes: ['id', 'username', 'display_name', 'avatar_url', 'role', 'level'] }]
    });
    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
