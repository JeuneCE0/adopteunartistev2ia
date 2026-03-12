const express = require('express');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caracteres' });
    }

    const existingUser = await User.findOne({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est deja utilise' });
    }

    const existingUsername = await User.findOne({
      where: { username }
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est deja pris' });
    }

    const user = await User.create({
      username,
      email,
      password_hash: password
    });

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });

    res.status(201).json({
      message: 'Inscription reussie',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Email/nom d\'utilisateur et mot de passe requis' });
    }

    // Allow login with email or username
    const user = await User.findOne({
      where: login.includes('@')
        ? { email: login }
        : { username: login }
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Update online status
    await user.update({ is_online: true, last_seen: new Date() });

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });

    res.json({
      message: 'Connexion reussie',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await req.user.update({ is_online: false, last_seen: new Date() });
    res.json({ message: 'Deconnexion reussie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

module.exports = router;
