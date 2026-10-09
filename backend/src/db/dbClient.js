const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

let pgPool = null;
let sqliteDb = null;
let activeEngine = 'none';

function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const dataDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'zynora.db');
  sqliteDb = new DatabaseSync(dbPath);
  activeEngine = 'sqlite';
  logger.info({
    action: 'DATABASE_INITIALIZATION',
    module: 'DATABASE',
    status: 'SUCCESS',
    details: { engine: 'sqlite', dbPath }
  });
  return sqliteDb;
}

async function initDb() {
  if (config.DATABASE_URL && config.DATABASE_URL.trim() !== '') {
    try {
      // Detect Render-hosted databases: internal URLs use hostnames like dpg-xxx-a
      // External URLs contain .render.com — both require SSL with self-signed cert
      const isRenderOrSsl = (
        config.DATABASE_URL.includes('render.com') ||
        config.DATABASE_URL.includes('dpg-') ||
        config.DATABASE_URL.includes('-a.oregon') ||
        config.DATABASE_URL.includes('-a.virginia') ||
        config.DATABASE_URL.includes('-a.frankfurt') ||
        config.DATABASE_URL.includes('-a.singapore') ||
        config.DATABASE_URL.includes('-a/') ||   // internal URL suffix: hostname-a/dbname
        config.DATABASE_URL.includes('sslmode=require')
      );
      pgPool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl: isRenderOrSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 20000,  // Allow 20s for external/remote connections
        idleTimeoutMillis: 30000,
        max: 10                           // Max pool size
      });
      // Test connection
      await pgPool.query('SELECT 1');
      activeEngine = 'postgres';
      logger.info({
        action: 'DATABASE_CONNECTION',
        module: 'DATABASE',
        status: 'SUCCESS',
        details: { engine: 'postgres', urlSanitized: config.DATABASE_URL.replace(/:[^:@]*@/, ':****@') }
      });
      return;
    } catch (err) {
      logger.error({
        action: 'DATABASE_CONNECTION_FALLBACK',
        module: 'DATABASE',
        errorCode: 'PG_FALLBACK',
        error: err,
        details: { message: 'PostgreSQL connection failed; falling back to local persistent SQLite for local development.' }
      });
      pgPool = null;
    }
  }

  // Fallback to local SQLite
  initSqlite();
}

// Convert PostgreSQL parameterized query ($1, $2) to SQLite (?)
function transformSqlForSqlite(sql, params = []) {
  let sqliteSql = sql;
  
  // Replace $1, $2, ... with ?
  sqliteSql = sqliteSql.replace(/\$(\d+)/g, '?');

  // Convert boolean literals or syntax if needed
  sqliteSql = sqliteSql.replace(/TRUE/gi, '1').replace(/FALSE/gi, '0');

  // Convert NOW() to CURRENT_TIMESTAMP
  sqliteSql = sqliteSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

  // Transform Postgres specific types in migrations if any
  sqliteSql = sqliteSql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  sqliteSql = sqliteSql.replace(/UUID/gi, 'TEXT');
  sqliteSql = sqliteSql.replace(/TIMESTAMP WITH TIME ZONE/gi, 'TEXT');
  sqliteSql = sqliteSql.replace(/TIMESTAMP/gi, 'TEXT');

  // Clean parameters (convert booleans to 1/0, undefined to null for sqlite)
  const convertedParams = params.map(val => {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });

  return { sql: sqliteSql, params: convertedParams };
}

const db = {
  init: async () => {
    if (activeEngine === 'none') {
      await initDb();
    }
    return activeEngine;
  },

  isPostgres: () => activeEngine === 'postgres',
  getEngine: () => activeEngine,

  query: async (text, params = []) => {
    if (activeEngine === 'none') {
      await initDb();
    }

    if (activeEngine === 'postgres' && pgPool) {
      try {
        const res = await pgPool.query(text, params);
        return {
          rows: res.rows,
          rowCount: res.rowCount
        };
      } catch (err) {
        logger.error({
          action: 'DB_QUERY_ERROR',
          module: 'DATABASE',
          errorCode: 'PG_QUERY_FAIL',
          error: err,
          details: { text }
        });
        throw err;
      }
    } else {
      // SQLite execution
      try {
        const { sql, params: transformedParams } = transformSqlForSqlite(text, params);
        const trimmed = sql.trim();
        const isSelect = /^SELECT/i.test(trimmed);
        const hasReturning = /RETURNING/i.test(trimmed);

        const stmt = sqliteDb.prepare(sql);

        if (isSelect || hasReturning) {
          const rows = stmt.all(...transformedParams);
          // Normalize row objects and booleans (e.g. grounded 1 -> true)
          const normalizedRows = rows.map(r => {
            const rowCopy = { ...r };
            if ('grounded' in rowCopy) {
              rowCopy.grounded = Boolean(rowCopy.grounded);
            }
            return rowCopy;
          });
          return {
            rows: normalizedRows,
            rowCount: normalizedRows.length
          };
        } else {
          const info = stmt.run(...transformedParams);
          return {
            rows: [],
            rowCount: info.changes
          };
        }
      } catch (err) {
        logger.error({
          action: 'DB_QUERY_ERROR',
          module: 'DATABASE',
          errorCode: 'SQLITE_QUERY_FAIL',
          error: err,
          details: { text }
        });
        throw err;
      }
    }
  },

  close: async () => {
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    if (sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    }
    activeEngine = 'none';
  }
};

module.exports = db;
