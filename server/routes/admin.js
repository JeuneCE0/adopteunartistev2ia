const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { User, Post, Comment, Reaction, Order, Product, Group, Event, Subscription, ArtistEarning, Badge, Quest, ForumThread, ForumReply, Stream, Notification, Message, Friendship } = require('../models');
const sequelize = require('../config/database');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      totalArtists,
      totalPosts,
      postsToday,
      totalProducts,
      totalOrders,
      totalGroups,
      totalEvents,
      totalStreams,
      totalForumThreads,
      onlineUsers
    ] = await Promise.all([
      User.count(),
      User.count({ where: { created_at: { [Op.gte]: today } } }),
      User.count({ where: { created_at: { [Op.gte]: thisWeek } } }),
      User.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
      User.count({ where: { role: 'artist' } }),
      Post.count(),
      Post.count({ where: { created_at: { [Op.gte]: today } } }),
      Product.count(),
      Order.count(),
      Group.count(),
      Event.count(),
      Stream.count(),
      ForumThread.count(),
      User.count({ where: { is_online: true } })
    ]);

    // Revenue stats
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    try {
      const revenueAll = await ArtistEarning.sum('amount');
      const revenueMonth = await ArtistEarning.sum('amount', { where: { created_at: { [Op.gte]: thisMonth } } });
      totalRevenue = revenueAll || 0;
      monthlyRevenue = revenueMonth || 0;
    } catch (e) {}

    // User growth - last 7 days
    const growth = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await User.count({ where: { created_at: { [Op.gte]: day, [Op.lt]: nextDay } } });
      growth.push({ date: day.toISOString().split('T')[0], count });
    }

    res.json({
      users: { total: totalUsers, today: newUsersToday, week: newUsersWeek, month: newUsersMonth, artists: totalArtists, online: onlineUsers },
      content: { posts: totalPosts, postsToday, products: totalProducts, orders: totalOrders, groups: totalGroups, events: totalEvents, streams: totalStreams, forumThreads: totalForumThreads },
      revenue: { total: parseFloat(totalRevenue), monthly: parseFloat(monthlyRevenue) },
      growth
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
});

// GET /api/admin/users - List all users with pagination, search, filter
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const sort = req.query.sort || 'newest';

    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;

    let order = [['created_at', 'DESC']];
    if (sort === 'oldest') order = [['created_at', 'ASC']];
    if (sort === 'level') order = [['level', 'DESC']];
    if (sort === 'xp') order = [['xp', 'DESC']];
    if (sort === 'alpha') order = [['username', 'ASC']];

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order,
      limit,
      offset
    });

    res.json({ users: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs' });
  }
});

// PUT /api/admin/users/:id - Update user (role, ban, etc.)
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouve' });

    const allowed = ['role', 'display_name', 'bio', 'level', 'xp', 'is_banned'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await user.update(updates);
    const updated = user.toJSON();
    delete updated.password_hash;
    res.json({ user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise a jour' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouve' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });

    await user.destroy();
    res.json({ message: 'Utilisateur supprime' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/admin/posts - List posts for moderation
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = {};
    if (search) {
      where.content = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url', 'role'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({ posts: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Admin posts error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des posts' });
  }
});

// DELETE /api/admin/posts/:id - Delete a post
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trouve' });
    await post.destroy();
    res.json({ message: 'Post supprime' });
  } catch (error) {
    console.error('Admin delete post error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/admin/products - List products for moderation
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      include: [{ model: User, as: 'seller', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({ products: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des produits' });
  }
});

// DELETE /api/admin/products/:id - Delete a product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    await product.destroy();
    res.json({ message: 'Produit supprime' });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/admin/orders - List all orders
router.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [{ model: User, as: 'buyer', attributes: ['id', 'username', 'display_name'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({ orders: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des commandes' });
  }
});

module.exports = router;
