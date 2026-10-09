const path = require('path');
// Load .env from the backend directory explicitly — works regardless of CWD
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'zynora_secret_jwt_key_super_secure_32_characters_min',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  DATABASE_URL: process.env.DATABASE_URL || '',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200,
  RAG_SIMILARITY_THRESHOLD: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.28,
  RAG_MAX_CHUNKS: parseInt(process.env.RAG_MAX_CHUNKS, 10) || 4,
  KNOWLEDGE_BASE_DIR: process.env.KNOWLEDGE_BASE_DIR 
    ? path.resolve(process.env.KNOWLEDGE_BASE_DIR) 
    : path.resolve(__dirname, '../../../knowledge-base')
};
