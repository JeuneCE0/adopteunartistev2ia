const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('physical', 'digital', 'service', 'commission'),
    defaultValue: 'digital'
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: -1 // -1 = unlimited
  },
  status: {
    type: DataTypes.ENUM('active', 'draft', 'sold_out', 'archived'),
    defaultValue: 'active'
  },
  download_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

module.exports = Product;
