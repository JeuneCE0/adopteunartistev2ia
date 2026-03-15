/**
 * Seed Platform Data - Adopte un Artiste
 * Seeds badges, quests, forum categories, and optionally demo content
 * Usage: node server/seed-platform.js [--with-demo]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// Fallback to .env.seed if .env doesn't have DB config
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.seed'), override: true });
}

const { sequelize, Badge, Quest, ForumCategory, Group, GroupMember, User, Product } = require('./models');
const bcrypt = require('bcryptjs');

const withDemo = process.argv.includes('--with-demo');

async function seedBadges() {
  const badges = [
    { name: 'Nouveau Membre', description: 'Bienvenue dans la communaute !', category: 'social', requirement_type: 'registration', requirement_value: 1, xp_reward: 10, icon_url: '/img/badge/badge-new.png' },
    { name: 'Premiere Publication', description: 'Publie ton premier post', category: 'content', requirement_type: 'posts', requirement_value: 1, xp_reward: 20, icon_url: '/img/badge/badge-post.png' },
    { name: 'Createur Actif', description: 'Publie 10 posts', category: 'content', requirement_type: 'posts', requirement_value: 10, xp_reward: 50, icon_url: '/img/badge/badge-creator.png' },
    { name: 'Prolifique', description: 'Publie 50 posts', category: 'content', requirement_type: 'posts', requirement_value: 50, xp_reward: 150, icon_url: '/img/badge/badge-prolific.png' },
    { name: 'Premier Ami', description: 'Ajoute ton premier ami', category: 'social', requirement_type: 'friends', requirement_value: 1, xp_reward: 15, icon_url: '/img/badge/badge-friend.png' },
    { name: 'Sociable', description: 'Ajoute 10 amis', category: 'social', requirement_type: 'friends', requirement_value: 10, xp_reward: 50, icon_url: '/img/badge/badge-social.png' },
    { name: 'Populaire', description: 'Ajoute 50 amis', category: 'social', requirement_type: 'friends', requirement_value: 50, xp_reward: 200, icon_url: '/img/badge/badge-popular.png' },
    { name: 'Vendeur Debutant', description: 'Mets ton premier produit en vente', category: 'marketplace', requirement_type: 'products', requirement_value: 1, xp_reward: 25, icon_url: '/img/badge/badge-seller.png' },
    { name: 'Boutique Etablie', description: 'Mets 10 produits en vente', category: 'marketplace', requirement_type: 'products', requirement_value: 10, xp_reward: 100, icon_url: '/img/badge/badge-shop.png' },
    { name: 'Premiere Vente', description: 'Realise ta premiere vente', category: 'marketplace', requirement_type: 'sales', requirement_value: 1, xp_reward: 50, icon_url: '/img/badge/badge-sale.png' },
    { name: 'Animateur', description: 'Cree ton premier groupe', category: 'social', requirement_type: 'groups_created', requirement_value: 1, xp_reward: 30, icon_url: '/img/badge/badge-group.png' },
    { name: 'Forumeur', description: 'Cree 5 sujets dans les forums', category: 'content', requirement_type: 'forum_threads', requirement_value: 5, xp_reward: 40, icon_url: '/img/badge/badge-forum.png' },
    { name: 'Commentateur', description: 'Laisse 20 commentaires', category: 'content', requirement_type: 'comments', requirement_value: 20, xp_reward: 35, icon_url: '/img/badge/badge-comment.png' },
    { name: 'Niveau 5', description: 'Atteins le niveau 5', category: 'progression', requirement_type: 'level', requirement_value: 5, xp_reward: 0, icon_url: '/img/badge/badge-lvl5.png' },
    { name: 'Niveau 10', description: 'Atteins le niveau 10', category: 'progression', requirement_type: 'level', requirement_value: 10, xp_reward: 0, icon_url: '/img/badge/badge-lvl10.png' },
    { name: 'Streameur', description: 'Lance ton premier stream', category: 'content', requirement_type: 'streams', requirement_value: 1, xp_reward: 40, icon_url: '/img/badge/badge-stream.png' },
    { name: 'Organisateur', description: 'Cree ton premier evenement', category: 'social', requirement_type: 'events', requirement_value: 1, xp_reward: 30, icon_url: '/img/badge/badge-event.png' },
    { name: 'Mecene', description: 'Abonne-toi a un artiste', category: 'marketplace', requirement_type: 'subscriptions', requirement_value: 1, xp_reward: 25, icon_url: '/img/badge/badge-patron.png' }
  ];

  let created = 0;
  for (const badge of badges) {
    const [, wasCreated] = await Badge.findOrCreate({
      where: { name: badge.name },
      defaults: badge
    });
    if (wasCreated) created++;
  }
  console.log(`  Badges: ${created} created, ${badges.length - created} already existed`);
}

async function seedQuests() {
  const quests = [
    // Daily quests
    { title: 'Post du jour', description: 'Publie au moins un post aujourd\'hui', type: 'daily', requirement_type: 'posts_today', requirement_value: 1, xp_reward: 10 },
    { title: 'Commentateur du jour', description: 'Laisse 3 commentaires aujourd\'hui', type: 'daily', requirement_type: 'comments_today', requirement_value: 3, xp_reward: 15 },
    { title: 'Like du jour', description: 'Reagis a 5 posts aujourd\'hui', type: 'daily', requirement_type: 'reactions_today', requirement_value: 5, xp_reward: 10 },

    // Weekly quests
    { title: 'Createur de la semaine', description: 'Publie 5 posts cette semaine', type: 'weekly', requirement_type: 'posts_week', requirement_value: 5, xp_reward: 50 },
    { title: 'Connecteur', description: 'Ajoute 2 amis cette semaine', type: 'weekly', requirement_type: 'friends_week', requirement_value: 2, xp_reward: 30 },
    { title: 'Decouverte', description: 'Rejoins un nouveau groupe cette semaine', type: 'weekly', requirement_type: 'groups_week', requirement_value: 1, xp_reward: 25 },
    { title: 'Dialoguiste', description: 'Envoie 10 messages cette semaine', type: 'weekly', requirement_type: 'messages_week', requirement_value: 10, xp_reward: 20 },

    // One-time quests
    { title: 'Profil complet', description: 'Remplis toutes les sections de ton profil (avatar, bio, liens sociaux)', type: 'one_time', requirement_type: 'profile_complete', requirement_value: 1, xp_reward: 50 },
    { title: 'Premiere vente', description: 'Realise ta premiere vente sur la marketplace', type: 'one_time', requirement_type: 'first_sale', requirement_value: 1, xp_reward: 100 },
    { title: 'Debut de collection', description: 'Achete ton premier produit sur la marketplace', type: 'one_time', requirement_type: 'first_purchase', requirement_value: 1, xp_reward: 30 },
    { title: 'Leader communautaire', description: 'Cree un groupe et atteins 5 membres', type: 'one_time', requirement_type: 'group_5_members', requirement_value: 1, xp_reward: 75 },
    { title: 'Expert du forum', description: 'Cree 10 sujets dans les forums', type: 'one_time', requirement_type: 'forum_threads', requirement_value: 10, xp_reward: 60 }
  ];

  let created = 0;
  for (const quest of quests) {
    const [, wasCreated] = await Quest.findOrCreate({
      where: { title: quest.title },
      defaults: quest
    });
    if (wasCreated) created++;
  }
  console.log(`  Quests: ${created} created, ${quests.length - created} already existed`);
}

async function seedForumCategories() {
  const categories = [
    { name: 'Presentations', description: 'Presentez-vous a la communaute !', order_index: 1 },
    { name: 'Art & Creation', description: 'Partagez et discutez de vos creations artistiques', order_index: 2 },
    { name: 'Musique', description: 'Discussions musicales, compositions, instruments', order_index: 3 },
    { name: 'Arts Visuels', description: 'Peinture, illustration, photo, video, graphisme', order_index: 4 },
    { name: 'Ecriture & Litterature', description: 'Prose, poesie, scenarisation', order_index: 5 },
    { name: 'Technique & Tutoriels', description: 'Partagez vos techniques et tutoriels', order_index: 6 },
    { name: 'Marketplace & Ventes', description: 'Questions et discussions sur la marketplace', order_index: 7 },
    { name: 'Collaborations', description: 'Trouvez des collaborateurs pour vos projets', order_index: 8 },
    { name: 'Evenements & Rencontres', description: 'Organisez et discutez des evenements', order_index: 9 },
    { name: 'Aide & Support', description: 'Questions sur le fonctionnement de la plateforme', order_index: 10 },
    { name: 'Discussions Generales', description: 'Tout sujet qui ne rentre pas dans les autres categories', order_index: 11 }
  ];

  let created = 0;
  for (const cat of categories) {
    const [, wasCreated] = await ForumCategory.findOrCreate({
      where: { name: cat.name },
      defaults: cat
    });
    if (wasCreated) created++;
  }
  console.log(`  Forum categories: ${created} created, ${categories.length - created} already existed`);
}

async function seedDemoContent() {
  console.log('\nSeeding demo content...');

  // Create demo users
  const password_hash = await bcrypt.hash('Demo1234!', 10);
  const demoUsers = [
    { username: 'marie_artiste', email: 'marie@demo.com', password_hash, role: 'artist', display_name: 'Marie Dupont', bio: 'Illustratrice freelance passionnee par l\'aquarelle et le digital art', level: 8, xp: 780 },
    { username: 'lucas_music', email: 'lucas@demo.com', password_hash, role: 'artist', display_name: 'Lucas Martin', bio: 'Compositeur et producteur musical - Ambient / Electronica', level: 6, xp: 520 },
    { username: 'sophie_photo', email: 'sophie@demo.com', password_hash, role: 'artist', display_name: 'Sophie Bernard', bio: 'Photographe professionnelle - Portraits et paysages', level: 10, xp: 1200 },
    { username: 'alex_design', email: 'alex@demo.com', password_hash, role: 'artist', display_name: 'Alex Moreau', bio: 'Designer graphique et typographe', level: 4, xp: 350 },
    { username: 'emma_writer', email: 'emma@demo.com', password_hash, role: 'artist', display_name: 'Emma Petit', bio: 'Autrice de romans et poesie contemporaine', level: 7, xp: 650 }
  ];

  const createdUsers = [];
  for (const userData of demoUsers) {
    const [user] = await User.findOrCreate({
      where: { email: userData.email },
      defaults: userData
    });
    createdUsers.push(user);
  }
  console.log(`  Demo users: ${createdUsers.length} ensured`);

  // Create demo groups
  const demoGroups = [
    { name: 'Artistes de France', description: 'Communaute des artistes francophones', type: 'public', creator_id: createdUsers[0].id },
    { name: 'Musique Independante', description: 'Pour les musiciens independants', type: 'public', creator_id: createdUsers[1].id },
    { name: 'Photo & Video', description: 'Partagez vos meilleures prises', type: 'public', creator_id: createdUsers[2].id },
    { name: 'Design Graphique', description: 'Tendances et techniques en design', type: 'public', creator_id: createdUsers[3].id }
  ];

  for (const groupData of demoGroups) {
    const [group, wasCreated] = await Group.findOrCreate({
      where: { name: groupData.name },
      defaults: groupData
    });
    if (wasCreated) {
      await GroupMember.findOrCreate({
        where: { group_id: group.id, user_id: groupData.creator_id },
        defaults: { group_id: group.id, user_id: groupData.creator_id, role: 'admin' }
      });
    }
  }
  console.log('  Demo groups: created');

  // Create demo products
  const demoProducts = [
    { seller_id: createdUsers[0].id, title: 'Portrait Aquarelle Personnalise', description: 'Un portrait unique realise a l\'aquarelle sur papier 300g', price: 75.00, category: 'illustration', type: 'commission', status: 'active' },
    { seller_id: createdUsers[0].id, title: 'Pack Illustrations Digitales', description: '5 illustrations digitales haute resolution pour vos projets', price: 45.00, category: 'illustration', type: 'digital', status: 'active' },
    { seller_id: createdUsers[1].id, title: 'Composition Musicale sur Mesure', description: 'Musique originale pour vos projets video, podcast ou jeu', price: 120.00, category: 'musique', type: 'service', status: 'active' },
    { seller_id: createdUsers[2].id, title: 'Shooting Photo Portrait', description: 'Seance photo portrait 1h en studio ou exterieur', price: 150.00, category: 'photographie', type: 'service', status: 'active' },
    { seller_id: createdUsers[2].id, title: 'Pack Presets Lightroom', description: '20 presets professionnels pour Lightroom', price: 25.00, category: 'photographie', type: 'digital', status: 'active' },
    { seller_id: createdUsers[3].id, title: 'Logo Professionnel', description: 'Creation de logo avec 3 propositions et revisions illimitees', price: 200.00, category: 'design', type: 'service', status: 'active' },
    { seller_id: createdUsers[4].id, title: 'Recueil de Poesie - "Eclats"', description: 'Mon premier recueil de poesie contemporaine, format PDF', price: 8.00, category: 'ecriture', type: 'digital', status: 'active' }
  ];

  let prodCreated = 0;
  for (const prod of demoProducts) {
    const [, wasCreated] = await Product.findOrCreate({
      where: { title: prod.title, seller_id: prod.seller_id },
      defaults: prod
    });
    if (wasCreated) prodCreated++;
  }
  console.log(`  Demo products: ${prodCreated} created`);
}

async function main() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected. Syncing tables...');
    await sequelize.sync();
    console.log('Tables synced.\n');

    console.log('Seeding platform data...');
    await seedBadges();
    await seedQuests();
    await seedForumCategories();

    if (withDemo) {
      await seedDemoContent();
    }

    console.log('\nSeed complete!');
    if (!withDemo) {
      console.log('Tip: Run with --with-demo to also create demo users, groups and products');
    }
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

main();
