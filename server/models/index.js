const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const Friendship = require('./Friendship');

// User <-> Post
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// User <-> Friendship
User.hasMany(Friendship, { foreignKey: 'requester_id', as: 'sentRequests' });
User.hasMany(Friendship, { foreignKey: 'receiver_id', as: 'receivedRequests' });
Friendship.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
Friendship.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

const db = {
  sequelize,
  User,
  Post,
  Friendship
};

module.exports = db;
