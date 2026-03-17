const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stream = sequelize.define('Stream', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('live', 'ended', 'scheduled'),
    defaultValue: 'scheduled'
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  stream_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  viewer_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'streams',
  timestamps: true,
  underscored: true
});

module.exports = Stream;
