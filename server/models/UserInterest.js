const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserInterest = sequelize.define('UserInterest', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  tag: {
    type: DataTypes.STRING(100),
    primaryKey: true
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0
  }
}, {
  tableName: 'user_interests',
  timestamps: true,
  underscored: true
});

module.exports = UserInterest;
