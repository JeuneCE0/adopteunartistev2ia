const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quest = sequelize.define('Quest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('daily', 'weekly', 'one_time'),
    defaultValue: 'one_time'
  },
  requirement_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  requirement_value: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  xp_reward: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  badge_reward_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cover_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'quests',
  timestamps: true,
  underscored: true
});

module.exports = Quest;
