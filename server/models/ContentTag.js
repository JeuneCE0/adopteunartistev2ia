const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContentTag = sequelize.define('ContentTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tag: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'content_tags',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['content_type', 'content_id'] },
    { fields: ['tag'] }
  ]
});

module.exports = ContentTag;
