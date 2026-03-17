const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionTier = sequelize.define('SubscriptionTier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'subscription_tiers',
  timestamps: true,
  underscored: true
});

module.exports = SubscriptionTier;
