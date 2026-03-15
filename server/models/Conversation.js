const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('private', 'group'),
    defaultValue: 'private'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  underscored: true
});

module.exports = Conversation;
