const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Order, OrderItem, Product, CartItem, User, ArtistEarning } = require('../models');
const sequelize = require('../config/database');
const { awardXP } = require('../services/gamification');
const { createNotification } = require('../socket/notifications');

// Create order from cart
router.post('/', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Product, as: 'product' }],
      transaction: t
    });

    if (cartItems.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Le panier est vide' });
    }

    // Calculate total
    let total = 0;
    for (const item of cartItems) {
      if (item.product.stock !== -1 && item.product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ error: `Stock insuffisant pour ${item.product.title}` });
      }
      total += parseFloat(item.product.price) * item.quantity;
    }

    // Create order
    const order = await Order.create({
      buyer_id: req.user.id,
      total: total.toFixed(2),
      status: 'pending'
    }, { transaction: t });

    // Create order items and update stock
    for (const item of cartItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product.price
      }, { transaction: t });

      if (item.product.stock !== -1) {
        await item.product.update(
          { stock: item.product.stock - item.quantity },
          { transaction: t }
        );
        if (item.product.stock - item.quantity <= 0) {
          await item.product.update({ status: 'sold_out' }, { transaction: t });
        }
      }
    }

    // Clear cart
    await CartItem.destroy({ where: { user_id: req.user.id }, transaction: t });

    await t.commit();

    // Mark as paid (simplified - no actual Stripe integration yet)
    await order.update({ status: 'paid' });

    // Record earnings for each seller and notify them
    const io = req.app.get('io');
    const buyerName = req.user.display_name || req.user.username;
    const sellerIds = new Set();
    for (const item of cartItems) {
      sellerIds.add(item.product.seller_id);
      await ArtistEarning.create({
        artist_id: item.product.seller_id,
        amount: parseFloat(item.product.price) * item.quantity,
        type: 'sale',
        source_id: order.id
      }).catch(() => {});
    }
    for (const sellerId of sellerIds) {
      createNotification(io, {
        userId: sellerId,
        type: 'order',
        title: 'Nouvelle commande !',
        content: buyerName + ' a passe une commande de ' + total.toFixed(2) + ' EUR',
        link: '/hub-store-statement.html'
      }).catch(e => console.error('Notification error:', e));
    }

    // Gamification
    awardXP(req.user.id, 'order_complete', io).catch(e => console.error('XP error:', e));

    res.status(201).json({ order });
  } catch (error) {
    await t.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my orders (buyer)
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: { buyer_id: req.user.id },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{ model: User, as: 'seller', attributes: ['id', 'username', 'display_name'] }]
        }]
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({ orders, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('My orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get seller orders
router.get('/seller-orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          where: { seller_id: req.user.id }
        }]
      }, {
        model: User,
        as: 'buyer',
        attributes: ['id', 'username', 'display_name', 'avatar_url']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ orders: orders.filter(o => o.items.length > 0) });
  } catch (error) {
    console.error('Seller orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update order status (seller)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvee' });

    const isSeller = order.items.some(item => item.product.seller_id === req.user.id);
    if (!isSeller && req.user.role !== 'admin') return res.status(403).json({ error: 'Acces refuse' });

    const { status } = req.body;
    await order.update({ status });

    // Notify buyer of status change
    const io = req.app.get('io');
    const statusLabels = { shipped: 'expediee', delivered: 'livree', completed: 'terminee', refunded: 'remboursee' };
    if (statusLabels[status]) {
      createNotification(io, {
        userId: order.buyer_id,
        type: 'order_update',
        title: 'Commande ' + statusLabels[status],
        content: 'Votre commande #' + order.id + ' a ete ' + statusLabels[status],
        link: '/hub-store-downloads.html'
      }).catch(e => console.error('Notification error:', e));
    }

    res.json({ order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
