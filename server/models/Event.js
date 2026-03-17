const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cover_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('online', 'in_person', 'hybrid'),
    defaultValue: 'online'
  }
}, {
  tableName: 'events',
  timestamps: true,
  underscored: true
});

module.exports = Event;
