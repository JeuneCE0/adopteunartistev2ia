const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Product, User, Review, CartItem } = require('../models');
const { Op } = require('sequelize');
const upload = require('../middleware/upload');

// List products with filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { category, type, search, sort } = req.query;

    const where = { status: 'active' };
    if (category) where.category = category;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let order = [['created_at', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];
    if (sort === 'popular') order = [['created_at', 'DESC']]; // TODO: sort by sales

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'username', 'display_name', 'avatar_url'] }
      ],
      order,
      limit,
      offset
    });

    // Add average rating
    const result = await Promise.all(products.map(async (p) => {
      const reviews = await Review.findAll({ where: { product_id: p.id }, attributes: ['rating'] });
      const prod = p.toJSON();
      prod.avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      prod.reviewCount = reviews.length;
      return prod;
    }));

    res.json({ products: result, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: User, as: 'seller', attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio'] }
      ]
    });
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });

    const reviews = await Review.findAll({
      where: { product_id: product.id },
      include: [{ model: User, as: 'reviewer', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']]
    });

    const result = product.toJSON();
    result.reviews = reviews;
    result.avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    result.reviewCount = reviews.length;

    res.json({ product: result });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create product
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, type, stock, download_url } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Titre et prix requis' });

    const product = await Product.create({
      seller_id: req.user.id,
      title,
      description,
      price: parseFloat(price),
      category,
      type: type || 'digital',
      stock: stock !== undefined ? parseInt(stock) : -1,
      download_url,
      image_url: req.file ? `/uploads/${req.file.filename}` : null
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    const { title, description, price, category, type, stock, status, download_url } = req.body;
    await product.update({
      title: title || product.title,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? parseFloat(price) : product.price,
      category: category || product.category,
      type: type || product.type,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      status: status || product.status,
      download_url: download_url || product.download_url
    });

    res.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Acces refuse' });

    await product.destroy();
    res.json({ message: 'Produit supprime' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my products (seller dashboard)
router.get('/seller/my-products', authenticate, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { seller_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json({ products });
  } catch (error) {
    console.error('My products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Add review
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });

    const existing = await Review.findOne({
      where: { user_id: req.user.id, product_id: product.id }
    });
    if (existing) return res.status(400).json({ error: 'Vous avez deja laisse un avis' });

    const { rating, content } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Note entre 1 et 5 requise' });

    const review = await Review.create({
      user_id: req.user.id,
      product_id: product.id,
      rating: parseInt(rating),
      content
    });

    const fullReview = await Review.findByPk(review.id, {
      include: [{ model: User, as: 'reviewer', attributes: ['id', 'username', 'display_name', 'avatar_url'] }]
    });

    res.status(201).json({ review: fullReview });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Cart operations
router.get('/cart/items', authenticate, async (req, res) => {
  try {
    const items = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Product, as: 'product', include: [
          { model: User, as: 'seller', attributes: ['id', 'username', 'display_name'] }
        ]}
      ]
    });
    const total = items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    res.json({ items, total: total.toFixed(2) });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/cart/add', authenticate, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });

    const existing = await CartItem.findOne({
      where: { user_id: req.user.id, product_id: productId }
    });

    if (existing) {
      await existing.update({ quantity: existing.quantity + (quantity || 1) });
      return res.json({ item: existing });
    }

    const item = await CartItem.create({
      user_id: req.user.id,
      product_id: productId,
      quantity: quantity || 1
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/cart/:itemId', authenticate, async (req, res) => {
  try {
    const item = await CartItem.findOne({
      where: { id: req.params.itemId, user_id: req.user.id }
    });
    if (!item) return res.status(404).json({ error: 'Article non trouve' });

    await item.destroy();
    res.json({ message: 'Article retire du panier' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
