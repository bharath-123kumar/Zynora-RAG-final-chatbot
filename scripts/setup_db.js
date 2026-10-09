/**
 * setup_db.js
 * Applies database migrations and initializes tables.
 */
const { runMigrations } = require('../backend/src/db/migrations/migrate');

async function main() {
  console.log('🔄 Applying Zynora Database Schema Migrations...');
  try {
    await runMigrations();
    console.log('✅ Database setup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  }
}

main();
