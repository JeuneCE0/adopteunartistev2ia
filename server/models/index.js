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
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const ForumCategory = require('./ForumCategory');
const ForumThread = require('./ForumThread');
const ForumReply = require('./ForumReply');
const Product = require('./Product');
const CartItem = require('./CartItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Review = require('./Review');

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

// Group <-> User (many-to-many through GroupMember)
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'group_id', otherKey: 'user_id', as: 'members' });
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'user_id', otherKey: 'group_id', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
User.hasMany(Group, { foreignKey: 'creator_id', as: 'createdGroups' });
GroupMember.belongsTo(User, { foreignKey: 'user_id' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id' });

// Forum
ForumCategory.hasMany(ForumThread, { foreignKey: 'category_id', as: 'threads' });
ForumThread.belongsTo(ForumCategory, { foreignKey: 'category_id', as: 'category' });
ForumThread.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(ForumThread, { foreignKey: 'user_id', as: 'threads' });
ForumThread.hasMany(ForumReply, { foreignKey: 'thread_id', as: 'replies' });
ForumReply.belongsTo(ForumThread, { foreignKey: 'thread_id' });
ForumReply.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(ForumReply, { foreignKey: 'user_id', as: 'forumReplies' });

// Product / Marketplace
User.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
User.hasMany(CartItem, { foreignKey: 'user_id', as: 'cartItems' });
CartItem.belongsTo(User, { foreignKey: 'user_id' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(CartItem, { foreignKey: 'product_id' });
User.hasMany(Order, { foreignKey: 'buyer_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id' });

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
  Notification,
  Group,
  GroupMember,
  ForumCategory,
  ForumThread,
  ForumReply,
  Product,
  CartItem,
  Order,
  OrderItem,
  Review
};

module.exports = db;
