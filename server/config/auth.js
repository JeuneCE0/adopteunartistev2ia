if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set in production!');
  process.exit(1);
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_not_for_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
