const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationParticipant = sequelize.define('ConversationParticipant', {
  conversation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  last_read_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'conversation_participants',
  timestamps: true,
  underscored: true
});

module.exports = ConversationParticipant;
