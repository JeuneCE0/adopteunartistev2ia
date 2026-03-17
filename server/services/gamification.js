const { User, Badge, UserBadge, Quest, UserQuest } = require('../models');

// XP rewards for actions
const XP_REWARDS = {
  post_create: 10,
  comment_create: 5,
  reaction_give: 2,
  friend_accept: 15,
  product_create: 20,
  order_complete: 25,
  group_create: 15,
  forum_thread: 10,
  forum_reply: 5,
  event_create: 15,
  subscription_create: 30
};

// Level calculation: level = floor(sqrt(xp / 100)) + 1
function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Award XP to a user
async function awardXP(userId, action, io) {
  const xp = XP_REWARDS[action] || 0;
  if (xp === 0) return;

  const user = await User.findByPk(userId);
  if (!user) return;

  const newXP = user.xp + xp;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > user.level;

  await user.update({ xp: newXP, level: newLevel });

  // Check badges after XP award
  await checkBadges(userId, io);

  // Update quest progress
  await updateQuestProgress(userId, action, io);

  // Notify if leveled up
  if (leveledUp && io) {
    io.to(`user_${userId}`).emit('level_up', { level: newLevel, xp: newXP });
  }

  return { xp: newXP, level: newLevel, xpGained: xp, leveledUp };
}

// Check and award badges
async function checkBadges(userId, io) {
  const user = await User.findByPk(userId);
  if (!user) return;

  const badges = await Badge.findAll();
  const userBadges = await UserBadge.findAll({ where: { user_id: userId } });
  const earnedIds = userBadges.map(ub => ub.badge_id);

  for (const badge of badges) {
    if (earnedIds.includes(badge.id)) continue;

    let earned = false;

    switch (badge.requirement_type) {
      case 'xp':
        earned = user.xp >= badge.requirement_value;
        break;
      case 'level':
        earned = user.level >= badge.requirement_value;
        break;
      case 'posts':
        const { Post } = require('../models');
        const postCount = await Post.count({ where: { user_id: userId } });
        earned = postCount >= badge.requirement_value;
        break;
      case 'friends':
        const { Friendship } = require('../models');
        const { Op } = require('sequelize');
        const friendCount = await Friendship.count({
          where: {
            [Op.or]: [{ requester_id: userId }, { receiver_id: userId }],
            status: 'accepted'
          }
        });
        earned = friendCount >= badge.requirement_value;
        break;
      case 'products':
        const { Product } = require('../models');
        const productCount = await Product.count({ where: { seller_id: userId, status: 'active' } });
        earned = productCount >= badge.requirement_value;
        break;
      case 'groups_created':
        const { Group } = require('../models');
        const groupCount = await Group.count({ where: { creator_id: userId } });
        earned = groupCount >= badge.requirement_value;
        break;
      case 'forum_threads':
        const { ForumThread } = require('../models');
        const threadCount = await ForumThread.count({ where: { user_id: userId } });
        earned = threadCount >= badge.requirement_value;
        break;
      case 'comments':
        const { Comment } = require('../models');
        const commentCount = await Comment.count({ where: { user_id: userId } });
        earned = commentCount >= badge.requirement_value;
        break;
      case 'registration':
        earned = true; // Always earned if user exists
        break;
    }

    if (earned) {
      await UserBadge.create({ user_id: userId, badge_id: badge.id });

      // Award badge XP
      if (badge.xp_reward > 0) {
        await user.update({ xp: user.xp + badge.xp_reward });
      }

      // Notify
      if (io) {
        io.to(`user_${userId}`).emit('badge_earned', {
          badge: { id: badge.id, name: badge.name, icon_url: badge.icon_url }
        });
      }
    }
  }
}

// Update quest progress
async function updateQuestProgress(userId, action, io) {
  const activeQuests = await UserQuest.findAll({
    where: { user_id: userId, status: 'active' },
    include: [{ model: Quest, as: 'quest' }]
  });

  for (const uq of activeQuests) {
    if (uq.quest && uq.quest.requirement_type === action) {
      const newProgress = uq.progress + 1;
      const completed = newProgress >= uq.quest.requirement_value;

      await uq.update({
        progress: newProgress,
        status: completed ? 'completed' : 'active',
        completed_at: completed ? new Date() : null
      });

      if (completed) {
        // Award quest XP
        if (uq.quest.xp_reward > 0) {
          const user = await User.findByPk(userId);
          const newXP = user.xp + uq.quest.xp_reward;
          await user.update({ xp: newXP, level: calculateLevel(newXP) });
        }

        // Award quest badge
        if (uq.quest.badge_reward_id) {
          const existing = await UserBadge.findOne({
            where: { user_id: userId, badge_id: uq.quest.badge_reward_id }
          });
          if (!existing) {
            await UserBadge.create({ user_id: userId, badge_id: uq.quest.badge_reward_id });
          }
        }

        if (io) {
          io.to(`user_${userId}`).emit('quest_completed', {
            quest: { id: uq.quest.id, title: uq.quest.title }
          });
        }
      }
    }
  }
}

module.exports = { awardXP, checkBadges, updateQuestProgress, calculateLevel, XP_REWARDS };
