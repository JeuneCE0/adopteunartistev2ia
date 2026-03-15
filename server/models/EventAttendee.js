const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventAttendee = sequelize.define('EventAttendee', {
  event_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('going', 'interested', 'not_going'),
    defaultValue: 'interested'
  }
}, {
  tableName: 'event_attendees',
  timestamps: true,
  underscored: true
});

module.exports = EventAttendee;
