const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArtistEarning = sequelize.define('ArtistEarning', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('subscription', 'sale', 'tip'),
    allowNull: false
  },
  source_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'artist_earnings',
  timestamps: true,
  underscored: true
});

module.exports = ArtistEarning;
