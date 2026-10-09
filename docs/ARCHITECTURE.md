# Architecture — Zynora AI RAG Chatbot

## System Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │           Browser / Client              │
                        │  React 19 + Vite + React Router DOM     │
                        │  Login | Chat | Admin | Monitoring      │
                        └──────────────────┬──────────────────────┘
                                           │ HTTP (JSON)
                        ┌──────────────────▼──────────────────────┐
                        │         Express.js REST API             │
                        │  CORS · JWT Auth · Rate Limit · Logging │
                        │  Input Validation · Error Handling      │
                        └──────────────────┬──────────────────────┘
              ┌──────────────────┬─────────┴────────┬────────────────────────┐
              │                  │                   │                        │
    ┌─────────▼──────┐  ┌───────▼──────┐  ┌────────▼──────┐  ┌─────────────▼────────┐
    │ Auth Controller│  │ Chat (RAG)   │  │ Conversation  │  │ Knowledge Admin      │
    │ Register/Login │  │ Controller   │  │ Controller    │  │ + Monitoring         │
    └────────────────┘  └──────┬───────┘  └──────┬────────┘  └──────────────────────┘
                               │                  │
                   ┌───────────▼──────────────┐   │
                   │     RAG Pipeline         │   │
                   │                          │   │
                   │  1. Injection Defense     │   │
                   │  2. Context Resolver      │   │
                   │  3. Vector Engine         │   │
                   │     BM25 + Cosine         │   │
                   │  4. Status Filter         │   │
                   │  5. Term Coverage         │   │
                   │  6. Grounded Synthesizer  │   │
                   │  7. Grounding Verification│   │
                   └───────────┬──────────────┘   │
                               │                  │
                   ┌───────────▼──────────────────▼──────────────┐
                   │              Database Layer                  │
                   │   PostgreSQL (prod) / SQLite (local dev)     │
                   │   users · conversations · messages           │
                   │   knowledge_documents · knowledge_chunks     │
                   │   source_references · response_evaluations   │
                   │   audit_logs                                 │
                   └─────────────────────────────────────────────┘
```

## RAG Pipeline Detail

### Document Ingestion
1. Read from `knowledge-base/approved/` (TXT, Markdown, JSON)
2. Clean text (normalize whitespace, Unicode, markdown)
3. Split into section-aware chunks (≤350 words per chunk)
4. Attach metadata (documentId, title, category, section, version, status)
5. Store in `knowledge_chunks` table

### Retrieval
1. Tokenize query (stop-word filtered)
2. Injection pattern check (deflect if adversarial)
3. Query `knowledge_chunks` joining `knowledge_documents` WHERE `status IN ('ACTIVE IN RAG', 'APPROVED')`
4. Build composite searchable text (title + section + content) for each chunk
5. Calculate BM25 score per chunk
6. Calculate Cosine Vector similarity (character 3-gram + term frequency vectors)
7. Apply section-header exact-match boost, tier definition boost
8. Filter by term coverage ≥ 30% AND hybrid score ≥ threshold
9. Return top-4 ranked chunks

### Answer Synthesis
1. Select top chunk and apply targeted extraction patterns
2. Verify ≥70% token overlap between extracted answer and retrieved context
3. Compute confidence = 0.7 × retrieval_score + 0.3 × grounding_ratio
4. Return grounded answer + source citations OR exact fallback

## Security Architecture

- **Zero-Trust JWT**: Every protected route verifies token signature and expiry
- **Ownership Enforcement**: Conversation queries include `AND user_id = $userId` always
- **Admin Authorization**: Separate `requireAdmin` middleware on `/api/knowledge` and `/api/monitoring`
- **Parameterized Queries**: All SQL uses `$1, $2...` placeholders — no string concatenation
- **Prompt Injection Defense**: 10 regex patterns deflect at retrieval layer before DB query
- **Sensitive Log Sanitization**: `password`, `token`, `secret`, `authorization` fields redacted

## Data Flow Security

```
User Request
    ↓ [CORS check]
    ↓ [Rate Limit check]
    ↓ [JWT verifyToken]
    ↓ [Input Validation]
    ↓ [Controller]
    ↓ [Ownership Check (conversations)]
    ↓ [RAG: Injection Defense → Status Filter → Grounding Verification]
    ↓ [Response: no stack traces, no secrets, no ungrounded answers]
```
