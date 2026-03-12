const express = require('express');
const { Op } = require('sequelize');
const { User, Post, Friendship, Reaction, Comment } = require('../models');
const sequelize = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// POST /api/posts - Create a post
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { content, visibility = 'public' } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Le post doit contenir du texte ou une image' });
    }

    const postData = {
      user_id: req.user.id,
      content,
      visibility,
      type: req.file ? 'image' : 'text'
    };

    if (req.file) {
      postData.image_url = 'uploads/' + req.file.filename;
    }

    const post = await Post.create(postData);
    const fullPost = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author', attributes: { exclude: ['password_hash'] } }]
    });

    res.status(201).json({ post: fullPost });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/posts/feed - Get newsfeed (own + friends' posts)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get friend IDs
    const friendships = await Friendship.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requester_id: req.user.id }, { receiver_id: req.user.id }]
      }
    });

    const friendIds = friendships.map(f =>
      f.requester_id === req.user.id ? f.receiver_id : f.requester_id
    );

    // Get posts from self + friends (public and friends visibility)
    const { rows: posts, count } = await Post.findAndCountAll({
      where: {
        [Op.or]: [
          { user_id: req.user.id },
          {
            user_id: { [Op.in]: friendIds },
            visibility: { [Op.in]: ['public', 'friends'] }
          },
          { visibility: 'public' }
        ]
      },
      include: [{ model: User, as: 'author', attributes: { exclude: ['password_hash'] } }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    const enrichedPosts = await enrichPosts(posts, req.user.id);

    res.json({
      posts: enrichedPosts,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/posts/user/:userId - Get user's posts
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.params.userId };

    // If not the owner, only show public posts (or friends if they're friends)
    if (!req.user || req.user.id !== parseInt(req.params.userId)) {
      const visibilities = ['public'];
      if (req.user) {
        const friendship = await Friendship.findOne({
          where: {
            status: 'accepted',
            [Op.or]: [
              { requester_id: req.user.id, receiver_id: parseInt(req.params.userId) },
              { requester_id: parseInt(req.params.userId), receiver_id: req.user.id }
            ]
          }
        });
        if (friendship) visibilities.push('friends');
      }
      where.visibility = { [Op.in]: visibilities };
    }

    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: { exclude: ['password_hash'] } }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      posts,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/posts/:id - Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: { exclude: ['password_hash'] } }]
    });

    if (!post) {
      return res.status(404).json({ error: 'Post non trouve' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post non trouve' });
    }
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    const { content, visibility } = req.body;
    await post.update({ content, visibility });

    const fullPost = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author', attributes: { exclude: ['password_hash'] } }]
    });

    res.json({ post: fullPost });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post non trouve' });
    }
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorise' });
    }

    await post.destroy();
    res.json({ message: 'Post supprime' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Helper to enrich posts with reaction/comment counts
async function enrichPosts(posts, userId) {
  return Promise.all(posts.map(async (post) => {
    const postJson = post.toJSON ? post.toJSON() : post;

    const reactionCount = await Reaction.count({ where: { post_id: postJson.id } });
    const commentCount = await Comment.count({ where: { post_id: postJson.id } });

    let userReaction = null;
    if (userId) {
      const reaction = await Reaction.findOne({ where: { post_id: postJson.id, user_id: userId } });
      if (reaction) userReaction = reaction.type;
    }

    return { ...postJson, reactionCount, commentCount, userReaction };
  }));
}

module.exports = router;
