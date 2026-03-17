const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    defaultValue: null
  },
  video_url: {
    type: DataTypes.STRING(500),
    defaultValue: null
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'link'),
    defaultValue: 'text'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public'
  }
}, {
  tableName: 'posts',
  timestamps: true,
  underscored: true
});

module.exports = Post;
