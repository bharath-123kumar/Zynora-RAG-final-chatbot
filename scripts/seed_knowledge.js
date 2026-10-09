/**
 * seed_knowledge.js
 * Ingests approved documents and creates seed users.
 */
const { seedDatabase } = require('../backend/src/db/seeds/seed');

async function main() {
  console.log('🌱 Seeding Approved Zyngram Knowledge and Demo Accounts...');
  try {
    await seedDatabase();
    console.log('✅ Knowledge seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Knowledge seeding failed:', err.message);
    process.exit(1);
  }
}

main();
