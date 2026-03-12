const sequelize = require('../config/database');
const User = require('./User');

// All model associations will be defined here as we add more models

const db = {
  sequelize,
  User
};

module.exports = db;
