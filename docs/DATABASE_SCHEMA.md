# Database Schema — Zynora RAG Chatbot

**Engines Supported:** PostgreSQL (production), SQLite via node:sqlite (local development auto-fallback)

---

## Tables

### users
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt) |
| full_name | VARCHAR(255) | NOT NULL |
| role | VARCHAR(32) | NOT NULL DEFAULT 'user' ('user' or 'admin') |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### conversations
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| user_id | VARCHAR(64) | FK → users.id ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_conversations_user_id` on (user_id)

### messages
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| conversation_id | VARCHAR(64) | FK → conversations.id ON DELETE CASCADE |
| role | VARCHAR(32) | NOT NULL ('user' or 'assistant') |
| content | TEXT | NOT NULL |
| grounded | BOOLEAN | DEFAULT FALSE |
| confidence_score | REAL | NULL |
| response_time_ms | INTEGER | NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_messages_conversation_id` on (conversation_id)

### knowledge_documents
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| title | VARCHAR(255) | NOT NULL |
| category | VARCHAR(128) | NOT NULL |
| content | TEXT | NOT NULL |
| source | VARCHAR(255) | NOT NULL |
| version | VARCHAR(32) | NOT NULL DEFAULT '1.0' |
| status | VARCHAR(32) | NOT NULL DEFAULT 'DRAFT' (DRAFT/APPROVED/ACTIVE IN RAG/ARCHIVED) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_knowledge_documents_status`, `idx_knowledge_documents_category`

### knowledge_chunks
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| document_id | VARCHAR(64) | FK → knowledge_documents.id ON DELETE CASCADE |
| chunk_index | INTEGER | NOT NULL |
| section | VARCHAR(255) | NULL |
| content | TEXT | NOT NULL |
| token_count | INTEGER | NULL |
| metadata | TEXT | NULL (JSON string) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_knowledge_chunks_doc_id`

**Metadata JSON structure:**
```json
{
  "documentId": "uuid",
  "documentTitle": "Zyngram Franchise...",
  "category": "Franchise Structure",
  "section": "2. Physical Franchise Hierarchy",
  "version": "1.0",
  "source": "/path/to/file.md",
  "status": "ACTIVE IN RAG"
}
```

### source_references
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| message_id | VARCHAR(64) | FK → messages.id ON DELETE CASCADE |
| document_id | VARCHAR(64) | FK → knowledge_documents.id ON DELETE SET NULL |
| chunk_id | VARCHAR(64) | FK → knowledge_chunks.id ON DELETE SET NULL |
| document_title | VARCHAR(255) | NOT NULL |
| category | VARCHAR(128) | NOT NULL |
| section | VARCHAR(255) | NULL |
| version | VARCHAR(32) | NULL |
| relevance_score | REAL | NULL |
| source | VARCHAR(255) | NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_source_references_message_id`

### response_evaluations
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| user_id | VARCHAR(64) | NULL |
| conversation_id | VARCHAR(64) | NULL |
| question | TEXT | NOT NULL |
| answer | TEXT | NOT NULL |
| grounded | BOOLEAN | NOT NULL |
| confidence_score | REAL | NULL |
| retrieval_outcome | VARCHAR(32) | NULL ('SUCCESS' or 'NO_ANSWER') |
| response_time_ms | INTEGER | NULL |
| retrieved_chunk_count | INTEGER | DEFAULT 0 |
| error_details | TEXT | NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_response_evaluations_created_at`

### audit_logs
| Column | Type | Constraints |
|--------|------|------------|
| id | VARCHAR(64) | PK |
| user_id | VARCHAR(64) | NULL |
| action | VARCHAR(128) | NOT NULL |
| module | VARCHAR(64) | NOT NULL |
| status | VARCHAR(32) | NOT NULL |
| ip_address | VARCHAR(64) | NULL |
| trace_id | VARCHAR(64) | NULL |
| details | TEXT | NULL (sanitized JSON) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Indexes:** `idx_audit_logs_action`, `idx_audit_logs_user_id`

---

## Cascade Behavior Summary

| Delete | Cascade to |
|--------|-----------|
| users | → conversations → messages → source_references |
| conversations | → messages → source_references |
| knowledge_documents | → knowledge_chunks |
| messages | → source_references (CASCADE) |
| knowledge_documents (from source_references) | SET NULL (reference preserved) |

---

## Migration Commands

```powershell
# Run all pending migrations
node backend/src/db/migrations/migrate.js

# Or via npm script from root:
node scripts/setup_db.js
```

Migrations applied in filename order: `001_init_schema.sql`, `002_indexes.sql`
