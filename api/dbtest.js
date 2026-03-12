const { Sequelize } = require('sequelize');

module.exports = async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.json({ error: 'No DATABASE_URL set' });
    }

    const sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      },
      logging: false
    });

    await sequelize.authenticate();
    res.json({ status: 'db connected', dbUrl: dbUrl.replace(/:[^:@]+@/, ':***@') });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 3) });
  }
};
