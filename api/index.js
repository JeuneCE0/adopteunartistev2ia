// Explicit requires for Vercel bundler to include pg driver
require('pg');

const app = require('../server/app');

module.exports = app;
