const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const Friendship = require('./Friendship');
const Reaction = require('./Reaction');
const Comment = require('./Comment');
const Conversation = require('./Conversation');
const ConversationParticipant = require('./ConversationParticipant');
const Message = require('./Message');
const Notification = require('./Notification');

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
Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies', constraints: false });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent', constraints: false });

// Conversation <-> User (many-to-many through ConversationParticipant)
Conversation.belongsToMany(User, { through: ConversationParticipant, foreignKey: 'conversation_id', otherKey: 'user_id', as: 'participants' });
User.belongsToMany(Conversation, { through: ConversationParticipant, foreignKey: 'user_id', otherKey: 'conversation_id', as: 'conversations' });
Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversation_id', as: 'participantEntries' });
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversation_id' });
ConversationParticipant.belongsTo(User, { foreignKey: 'user_id' });

// Conversation <-> Message
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

const db = {
  sequelize,
  User,
  Post,
  Friendship,
  Reaction,
  Comment,
  Conversation,
  ConversationParticipant,
  Message,
  Notification
};

module.exports = db;
