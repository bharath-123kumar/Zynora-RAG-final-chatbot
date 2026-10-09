require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000
});

async function verify() {
  const res = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('\nTables in Render PostgreSQL (zynora_db_1k7q):');
  if (res.rows.length === 0) {
    console.log('  ⚠️  No tables found — migrations may not have run yet.');
  } else {
    res.rows.forEach(r => console.log('  ✅ ' + r.table_name));
  }

  // Check row counts for seeded tables
  const tables = ['users', 'knowledge_documents', 'knowledge_chunks'];
  console.log('\nRow counts:');
  for (const t of tables) {
    try {
      const c = await pool.query('SELECT COUNT(*) AS n FROM ' + t);
      console.log('  ' + t + ': ' + c.rows[0].n + ' rows');
    } catch (e) {
      console.log('  ' + t + ': ❌ ' + e.message);
    }
  }

  await pool.end();
}

verify().then(() => process.exit(0)).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
