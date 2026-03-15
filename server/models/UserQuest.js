const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserQuest = sequelize.define('UserQuest', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  quest_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'expired'),
    defaultValue: 'active'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_quests',
  timestamps: true,
  underscored: true
});

module.exports = UserQuest;
