const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Event, EventAttendee, User, Group } = require('../models');
const { Op } = require('sequelize');

// List events
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { type, upcoming } = req.query;

    const where = {};
    if (type) where.type = type;
    if (upcoming === 'true') where.start_date = { [Op.gte]: new Date() };

    const { count, rows: events } = await Event.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ],
      order: [['start_date', 'ASC']],
      limit,
      offset
    });

    const result = await Promise.all(events.map(async (event) => {
      const goingCount = await EventAttendee.count({ where: { event_id: event.id, status: 'going' } });
      const interestedCount = await EventAttendee.count({ where: { event_id: event.id, status: 'interested' } });
      const e = event.toJSON();
      e.goingCount = goingCount;
      e.interestedCount = interestedCount;
      return e;
    }));

    res.json({ events: result, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get event by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ]
    });
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });

    const goingCount = await EventAttendee.count({ where: { event_id: event.id, status: 'going' } });
    const interestedCount = await EventAttendee.count({ where: { event_id: event.id, status: 'interested' } });
    const attendees = await EventAttendee.findAll({
      where: { event_id: event.id },
      include: [{ model: User, attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    const result = event.toJSON();
    result.goingCount = goingCount;
    result.interestedCount = interestedCount;
    result.attendees = attendees;

    if (req.user) {
      const myAttendance = await EventAttendee.findOne({
        where: { event_id: event.id, user_id: req.user.id }
      });
      result.myStatus = myAttendance ? myAttendance.status : null;
    }

    res.json({ event: result });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create event
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, location, start_date, end_date, type, group_id } = req.body;
    if (!title || !start_date) return res.status(400).json({ error: 'Titre et date de debut requis' });

    const event = await Event.create({
      creator_id: req.user.id,
      group_id: group_id || null,
      title,
      description,
      location,
      start_date,
      end_date,
      type: type || 'online'
    });

    // Creator is automatically going
    await EventAttendee.create({ event_id: event.id, user_id: req.user.id, status: 'going' });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update event
router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });
    if (event.creator_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    const { title, description, location, start_date, end_date, type } = req.body;
    await event.update({ title, description, location, start_date, end_date, type });
    res.json({ event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });
    if (event.creator_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await event.destroy();
    res.json({ message: 'Evenement supprime' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// RSVP
router.post('/:id/rsvp', authenticate, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evenement non trouve' });

    const { status } = req.body;
    if (!['going', 'interested', 'not_going'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const [attendee, created] = await EventAttendee.findOrCreate({
      where: { event_id: event.id, user_id: req.user.id },
      defaults: { status }
    });

    if (!created) await attendee.update({ status });

    res.json({ attendee });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
