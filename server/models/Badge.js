const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Badge = sequelize.define('Badge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  requirement_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  requirement_value: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  xp_reward: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'badges',
  timestamps: true,
  underscored: true
});

module.exports = Badge;
