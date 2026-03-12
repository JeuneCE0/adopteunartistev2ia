const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const Friendship = require('./Friendship');
const Reaction = require('./Reaction');
const Comment = require('./Comment');

// User <-> Post
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// User <-> Friendship
User.hasMany(Friendship, { foreignKey: 'requester_id', as: 'sentRequests' });
User.hasMany(Friendship, { foreignKey: 'receiver_id', as: 'receivedRequests' });
Friendship.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
Friendship.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// Post <-> Reaction
Post.hasMany(Reaction, { foreignKey: 'post_id', as: 'reactions' });
Reaction.belongsTo(Post, { foreignKey: 'post_id' });
User.hasMany(Reaction, { foreignKey: 'user_id' });
Reaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Post <-> Comment
Post.hasMany(Comment, { foreignKey: 'post_id', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent' });

const db = {
  sequelize,
  User,
  Post,
  Friendship,
  Reaction,
  Comment
};

module.exports = db;
