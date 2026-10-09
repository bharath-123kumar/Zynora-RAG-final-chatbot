const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../dbClient');
const { ingestAllApprovedKnowledge } = require('../../rag/documentIngestor');
const logger = require('../../utils/logger');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  await db.init();

  const now = new Date().toISOString();

  // 1. Seed Users (Admin and Standard User)
  const users = [
    {
      id: 'usr_admin_001',
      email: 'admin@zyngram.com',
      password: 'Admin@Zynora2026!',
      fullName: 'Zyngram Chief Administrator',
      role: 'admin'
    },
    {
      id: 'usr_demo_002',
      email: 'user@zyngram.com',
      password: 'User@Zynora2026!',
      fullName: 'Zyngram Logistics Operator',
      role: 'user'
    }
  ];

  for (const u of users) {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, u.email, hash, u.fullName, u.role, now, now]
      );
      console.log(`✅ Seeded user: ${u.email} (${u.role})`);
    } else {
      console.log(`ℹ️ User already exists: ${u.email}`);
    }
  }

  // 2. Ingest Approved Knowledge Base Documents
  console.log('📚 Ingesting and chunking approved Zyngram knowledge documents...');
  const ingestResults = await ingestAllApprovedKnowledge();
  console.log(`✅ Ingested ${ingestResults.length} knowledge documents into database.`);

  logger.info({
    action: 'SEED_DATABASE_COMPLETE',
    module: 'SEED',
    status: 'SUCCESS',
    details: { userCount: users.length, docCount: ingestResults.length }
  });
  console.log('🎉 Database seeding completed successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal seed failure:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
