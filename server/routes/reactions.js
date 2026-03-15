const express = require('express');
const { User, Post, Reaction } = require('../models');
const { authenticate } = require('../middleware/auth');
const sequelize = require('../config/database');
const { awardXP } = require('../services/gamification');
const { createNotification } = require('../socket/notifications');

const router = express.Router();

// POST /api/posts/:id/react - React to a post
router.post('/:id/react', authenticate, async (req, res) => {
  try {
    const { type = 'like' } = req.body;
    const postId = parseInt(req.params.id);

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post non trouve' });
    }

    // Upsert reaction
    const [reaction, created] = await Reaction.findOrCreate({
      where: { user_id: req.user.id, post_id: postId },
      defaults: { type }
    });

    if (!created) {
      if (reaction.type === type) {
        // Same reaction = toggle off
        await reaction.destroy();
        const counts = await getReactionCounts(postId);
        return res.json({ message: 'Reaction retiree', removed: true, counts });
      }
      // Different reaction = update
      await reaction.update({ type });
    }

    const counts = await getReactionCounts(postId);

    // Gamification + notification for new reaction
    if (created) {
      const io = req.app.get('io');
      awardXP(req.user.id, 'reaction_give', io).catch(e => console.error('XP error:', e));
      if (post.user_id !== req.user.id) {
        const userName = req.user.display_name || req.user.username;
        createNotification(io, {
          userId: post.user_id,
          type: 'reaction',
          title: 'Nouvelle reaction',
          content: userName + ' a reagi a votre publication',
          link: '/profile-post.html?id=' + postId
        }).catch(e => console.error('Notification error:', e));
      }
    }

    res.json({ reaction, counts });
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/posts/:id/reactions - Get reactions for a post
router.get('/:id/reactions', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const reactions = await Reaction.findAll({
      where: { post_id: postId },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    const counts = await getReactionCounts(postId);
    res.json({ reactions, counts });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/posts/:id/comments - Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content, parent_id } = req.body;
    const postId = parseInt(req.params.id);

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas etre vide' });
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post non trouve' });
    }

    const { Comment } = require('../models');
    const comment = await Comment.create({
      user_id: req.user.id,
      post_id: postId,
      parent_id: parent_id || null,
      content: content.trim()
    });

    const fullComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    // Gamification + notification for comment
    const io = req.app.get('io');
    awardXP(req.user.id, 'comment_create', io).catch(e => console.error('XP error:', e));
    if (post.user_id !== req.user.id) {
      const userName = req.user.display_name || req.user.username;
      createNotification(io, {
        userId: post.user_id,
        type: 'comment',
        title: 'Nouveau commentaire',
        content: userName + ' a commente votre publication',
        link: '/profile-post.html?id=' + postId
      }).catch(e => console.error('Notification error:', e));
    }

    res.status(201).json({ comment: fullComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/posts/:id/comments - Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { Comment } = require('../models');

    const comments = await Comment.findAll({
      where: { post_id: postId, parent_id: null },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        {
          model: Comment, as: 'replies',
          include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
        }
      ],
      order: [['created_at', 'ASC'], [{ model: Comment, as: 'replies' }, 'created_at', 'ASC']]
    });

    const totalCount = await Comment.count({ where: { post_id: postId } });

    res.json({ comments, total: totalCount });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    const { Comment } = require('../models');
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouve' });
    }
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    await comment.destroy();
    res.json({ message: 'Commentaire supprime' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function getReactionCounts(postId) {
  const reactions = await Reaction.findAll({
    where: { post_id: postId },
    attributes: ['type', [sequelize.fn('COUNT', sequelize.col('type')), 'count']],
    group: ['type'],
    raw: true
  });

  const counts = {};
  let total = 0;
  reactions.forEach(r => {
    counts[r.type] = parseInt(r.count);
    total += parseInt(r.count);
  });
  counts.total = total;
  return counts;
}

module.exports = router;
