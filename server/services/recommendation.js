const { User, Post, Product, Event, Reaction, Friendship, UserInterest, ContentTag } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get recommended artists based on user interests and interactions
async function recommendArtists(userId, limit = 10) {
  try {
    // Get user's interests
    const interests = await UserInterest.findAll({ where: { user_id: userId } });
    const tags = interests.map(i => i.tag);

    // Get user's friends to exclude
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted'
      }
    });
    const friendIds = friendships.map(f => f.requester_id === userId ? f.receiver_id : f.requester_id);
    const excludeIds = [userId, ...friendIds];

    let artists;

    if (tags.length > 0) {
      // Content-based: find artists whose content matches user's interests
      const taggedContentIds = await ContentTag.findAll({
        where: { content_type: 'user', tag: { [Op.in]: tags } },
        attributes: ['content_id']
      });
      const artistIds = [...new Set(taggedContentIds.map(t => t.content_id))];

      artists = await User.findAll({
        where: {
          id: { [Op.in]: artistIds, [Op.notIn]: excludeIds },
          role: 'artist'
        },
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio', 'level', 'xp'],
        limit
      });
    }

    // Fallback: collaborative filtering - artists liked by similar users
    if (!artists || artists.length < limit) {
      const userReactions = await Reaction.findAll({
        where: { user_id: userId },
        attributes: ['post_id']
      });
      const postIds = userReactions.map(r => r.post_id);

      // Find users who reacted to the same posts
      const similarUserReactions = await Reaction.findAll({
        where: { post_id: { [Op.in]: postIds }, user_id: { [Op.ne]: userId } },
        attributes: ['user_id']
      });
      const similarUserIds = [...new Set(similarUserReactions.map(r => r.user_id))];

      // Find artists followed/liked by similar users
      const recommendedPosts = await Post.findAll({
        where: { user_id: { [Op.in]: similarUserIds, [Op.notIn]: excludeIds } },
        attributes: ['user_id'],
        group: ['user_id'],
        limit
      });

      const moreArtists = await User.findAll({
        where: {
          id: { [Op.in]: recommendedPosts.map(p => p.user_id), [Op.notIn]: excludeIds },
          role: 'artist'
        },
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio', 'level', 'xp'],
        limit: limit - (artists ? artists.length : 0)
      });

      artists = [...(artists || []), ...moreArtists];
    }

    // Final fallback: trending artists (most reactions recently)
    if (artists.length < limit) {
      const trending = await sequelize.query(`
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.level, u.xp,
               COUNT(r.id) as reaction_count
        FROM users u
        JOIN posts p ON p.user_id = u.id
        JOIN reactions r ON r.post_id = p.id
        WHERE u.role = 'artist'
          AND u.id NOT IN (:excludeIds)
          AND r.created_at > NOW() - INTERVAL '30 days'
        GROUP BY u.id
        ORDER BY reaction_count DESC
        LIMIT :limit
      `, {
        replacements: { excludeIds: excludeIds.length > 0 ? excludeIds : [0], limit: limit - artists.length },
        type: sequelize.QueryTypes.SELECT
      });

      artists = [...artists, ...trending.filter(t => !artists.find(a => a.id === t.id))];
    }

    return artists.slice(0, limit);
  } catch (error) {
    console.error('Recommend artists error:', error);
    return [];
  }
}

// Get recommended posts
async function recommendPosts(userId, limit = 10) {
  try {
    // Get posts from friends of friends, trending posts, and interest-based
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted'
      }
    });
    const friendIds = friendships.map(f => f.requester_id === userId ? f.receiver_id : f.requester_id);

    // Trending posts (most reactions in last 7 days)
    const trending = await sequelize.query(`
      SELECT p.*, u.username, u.display_name, u.avatar_url,
             COUNT(r.id) as reaction_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN reactions r ON r.post_id = p.id
      WHERE p.visibility = 'public'
        AND p.user_id != :userId
        AND p.user_id NOT IN (:friendIds)
        AND p.created_at > NOW() - INTERVAL '7 days'
      GROUP BY p.id, u.id
      ORDER BY reaction_count DESC
      LIMIT :limit
    `, {
      replacements: {
        userId,
        friendIds: friendIds.length > 0 ? friendIds : [0],
        limit
      },
      type: sequelize.QueryTypes.SELECT
    });

    return trending;
  } catch (error) {
    console.error('Recommend posts error:', error);
    return [];
  }
}

// Get recommended products
async function recommendProducts(userId, limit = 10) {
  try {
    const interests = await UserInterest.findAll({ where: { user_id: userId } });
    const tags = interests.map(i => i.tag);

    if (tags.length > 0) {
      const tagged = await ContentTag.findAll({
        where: { content_type: 'product', tag: { [Op.in]: tags } },
        attributes: ['content_id']
      });
      const productIds = tagged.map(t => t.content_id);

      if (productIds.length > 0) {
        return await Product.findAll({
          where: { id: { [Op.in]: productIds }, status: 'active' },
          include: [{ model: User, as: 'seller', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
          limit
        });
      }
    }

    // Fallback: popular products
    return await Product.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']],
      limit
    });
  } catch (error) {
    console.error('Recommend products error:', error);
    return [];
  }
}

// Get recommended events
async function recommendEvents(userId, limit = 10) {
  try {
    return await Event.findAll({
      where: { start_date: { [Op.gte]: new Date() } },
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['start_date', 'ASC']],
      limit
    });
  } catch (error) {
    console.error('Recommend events error:', error);
    return [];
  }
}

module.exports = { recommendArtists, recommendPosts, recommendProducts, recommendEvents };
