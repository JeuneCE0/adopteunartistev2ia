const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ForumCategory = sequelize.define('ForumCategory', {
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
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'forum_categories',
  timestamps: true,
  underscored: true
});

module.exports = ForumCategory;
