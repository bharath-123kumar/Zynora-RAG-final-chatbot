const fs = require('fs');
const path = require('path');
const db = require('../dbClient');
const logger = require('../../utils/logger');

// Bootstrap the migration tracking table (safe to run on every startup)
async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations() {
  try {
    const res = await db.query('SELECT filename FROM schema_migrations ORDER BY filename');
    return new Set(res.rows.map(r => r.filename));
  } catch {
    return new Set(); // Table may not exist yet during very first boot
  }
}

/**
 * Split SQL file content into individual executable statements.
 * Handles multi-line CREATE TABLE blocks safely — does NOT split on semicolons
 * that appear inside parentheses (e.g., inline REFERENCES constraints).
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let depth = 0; // Parenthesis depth

  // Process character by character to track paren depth
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // Skip single-line comments
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      current += '\n';
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') depth--;

    if (ch === ';' && depth === 0) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    } else {
      current += ch;
    }
  }

  // Catch any trailing statement without a final semicolon
  const trailing = current.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
}

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  await db.init();
  const engine = db.getEngine();
  console.log(`ℹ️ Database Engine: ${engine.toUpperCase()}`);

  // Ensure the tracking table exists first
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();

  const migrationsDir = path.resolve(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let newCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭️  Skipping (already applied): ${file}`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    const statements = splitSqlStatements(sqlContent);

    for (const statement of statements) {
      try {
        await db.query(statement);
      } catch (err) {
        console.error(`\nMigration error in ${file}`);
        console.error(`Statement preview: ${statement.slice(0, 200)}`);
        console.error(`Error: ${err.message}\n`);
        throw err;
      }
    }

    // Record this migration as applied
    await db.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [file]
    );
    console.log(`✅ Applied: ${file}`);
    newCount++;
  }

  if (newCount === 0) {
    console.log('✅ Database schema is up to date — no new migrations to apply.');
  }

  logger.info({
    action: 'MIGRATIONS_COMPLETED',
    module: 'DATABASE',
    status: 'SUCCESS',
    details: { migrationFiles: files, newlyApplied: newCount, engine }
  });
  console.log('🎉 All migrations applied successfully!');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal migration failure:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
