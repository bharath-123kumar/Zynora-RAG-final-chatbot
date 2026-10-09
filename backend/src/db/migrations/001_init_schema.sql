-- 001_init_schema.sql
-- Zynora PostgreSQL Core Schema

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  grounded BOOLEAN DEFAULT FALSE,
  confidence_score REAL DEFAULT NULL,
  response_time_ms INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  version VARCHAR(32) NOT NULL DEFAULT '1.0',
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  section VARCHAR(255),
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_references (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id VARCHAR(64) REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  chunk_id VARCHAR(64) REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  document_title VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  section VARCHAR(255),
  version VARCHAR(32),
  relevance_score REAL,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS response_evaluations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  conversation_id VARCHAR(64),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  grounded BOOLEAN NOT NULL,
  confidence_score REAL,
  retrieval_outcome VARCHAR(32),
  response_time_ms INTEGER,
  retrieved_chunk_count INTEGER DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  action VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64),
  trace_id VARCHAR(64),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
