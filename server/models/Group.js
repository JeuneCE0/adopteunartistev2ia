const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Group = sequelize.define('Group', {
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
  avatar_url: {
    type: DataTypes.STRING(500),
    defaultValue: 'img/avatar/default-group.jpg'
  },
  cover_url: {
    type: DataTypes.STRING(500),
    defaultValue: 'img/cover/01.jpg'
  },
  type: {
    type: DataTypes.ENUM('public', 'private', 'secret'),
    defaultValue: 'public'
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'groups',
  timestamps: true,
  underscored: true
});

module.exports = Group;
