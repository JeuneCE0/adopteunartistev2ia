const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subscriber_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tier_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired'),
    defaultValue: 'active'
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true
});

module.exports = Subscription;
