const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ForumReply = sequelize.define('ForumReply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  thread_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'forum_replies',
  timestamps: true,
  underscored: true
});

module.exports = ForumReply;
