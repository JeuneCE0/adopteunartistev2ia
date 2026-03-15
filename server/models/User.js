const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  display_name: {
    type: DataTypes.STRING(100),
    defaultValue: null
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    defaultValue: 'img/avatar/01.jpg'
  },
  cover_url: {
    type: DataTypes.STRING(500),
    defaultValue: 'img/cover/01.jpg'
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  country: {
    type: DataTypes.STRING(100),
    defaultValue: null
  },
  city: {
    type: DataTypes.STRING(100),
    defaultValue: null
  },
  birthday: {
    type: DataTypes.DATEONLY,
    defaultValue: null
  },
  role: {
    type: DataTypes.ENUM('user', 'artist', 'admin'),
    defaultValue: 'user'
  },
  xp: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
      if (!user.display_name) {
        user.display_name = user.username;
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = User;
