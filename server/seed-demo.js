require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.seed') });

const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function seedDemo() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected. Syncing tables...');
    await sequelize.sync();
    console.log('Tables synced.');

    // Check if demo user already exists
    const existing = await User.findOne({ where: { email: 'demo@adopteunartiste.com' } });
    if (existing) {
      console.log('Demo user already exists:', existing.username);
      process.exit(0);
    }

    // Create demo user
    const password_hash = await bcrypt.hash('Demo1234!', 10);
    const demoUser = await User.create({
      username: 'demo_artiste',
      email: 'demo@adopteunartiste.com',
      password_hash,
      role: 'artist',
      display_name: 'Artiste Demo',
      bio: 'Compte de demonstration - Bienvenue sur Adopte un Artiste !',
      level: 5,
      xp: 450,
      is_online: false
    });

    console.log('Demo account created:');
    console.log('  Email: demo@adopteunartiste.com');
    console.log('  Password: Demo1234!');
    console.log('  Username:', demoUser.username);
    console.log('  Role:', demoUser.role);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedDemo();
