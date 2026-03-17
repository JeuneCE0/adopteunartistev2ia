const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reaction = sequelize.define('Reaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('like', 'love', 'happy', 'sad', 'angry', 'funny', 'wow', 'dislike'),
    allowNull: false,
    defaultValue: 'like'
  }
}, {
  tableName: 'reactions',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'post_id'] }
  ]
});

module.exports = Reaction;
