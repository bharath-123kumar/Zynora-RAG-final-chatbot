# API Documentation — Zynora RAG Chatbot

**Base URL (local):** `http://localhost:5000`  
**Base URL (production):** `https://zynora-rag-chatbot-backend.onrender.com`

All API responses use standard JSON envelopes:
```json
{ "success": true/false, "error": "ERROR_CODE", "message": "Human description" }
```

---

## Public Endpoints

### GET /health
Returns full system health status.

**Response 200:**
```json
{
  "status": "UP",
  "timestamp": "2026-10-09T07:04:00.000Z",
  "uptimeSeconds": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "engine": "postgres" },
    "ragEngine": { "status": "ready", "activeDocuments": 5 }
  }
}
```

**Response 503** (unhealthy): Same body with `"status": "DOWN"`.

### GET /api/version
```json
{
  "name": "Zynora AI RAG Chatbot",
  "version": "1.0.0",
  "environment": "production",
  "releaseDate": "2026-10-09"
}
```

---

## Authentication Endpoints

### POST /api/auth/register
**Body:**
```json
{ "email": "alex@zyngram.com", "password": "Secure123!", "fullName": "Alex Morgan" }
```
**Response 201:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": "uuid", "email": "...", "fullName": "...", "role": "user" }
}
```

### POST /api/auth/login
**Body:**
```json
{ "email": "admin@zyngram.com", "password": "Admin@Zynora2026!" }
```
**Response 200:** Same structure as register.

### GET /api/auth/me
**Headers:** `Authorization: Bearer <token>`  
**Response 200:** Returns current user profile.

---

## RAG Chat Endpoint

### POST /api/zynora/chat
**Headers:** `Authorization: Bearer <token>` (optional — assigns to user if provided)

**Body:**
```json
{
  "message": "Explain the Physical Franchise Hierarchy.",
  "conversationId": "optional-uuid-to-continue-existing-conversation"
}
```

**Response 200:**
```json
{
  "success": true,
  "answer": "The Physical Franchise Hierarchy governs brick-and-mortar facilities...",
  "sources": [
    {
      "documentId": "uuid",
      "documentTitle": "Zyngram Franchise and Architectural Hierarchy",
      "category": "Franchise Structure",
      "section": "2. Physical Franchise Hierarchy",
      "version": "1.0",
      "relevanceScore": 0.842
    }
  ],
  "grounded": true,
  "retrievedChunks": [
    { "chunkId": "uuid", "documentTitle": "...", "section": "...", "score": 0.842 }
  ],
  "relevanceScores": [0.842, 0.791],
  "responseTimeMs": 12,
  "confidenceIndicator": 0.87,
  "conversationId": "uuid",
  "messageId": "uuid"
}
```

**Fallback response (no approved evidence):**
```json
{
  "success": true,
  "answer": "I couldn't find this information in the approved Zyngram knowledge base.",
  "sources": [],
  "grounded": false,
  "confidenceIndicator": 0.0,
  "retrievalOutcome": "NO_ANSWER"
}
```

---

## Conversation Endpoints (Authenticated)

### POST /api/conversations
**Body:** `{ "title": "Optional custom title" }`  
**Response 201:** Returns created conversation object.

### GET /api/conversations
Returns array of user's conversations (ownership enforced).

### GET /api/conversations/:id
Returns full conversation including all messages and source references.

### PUT /api/conversations/:id
**Body:** `{ "title": "New Title" }`  
Renames the conversation.

### DELETE /api/conversations/:id
Permanently deletes conversation and all messages.

### POST /api/conversations/:id/clear
Deletes all messages while preserving the conversation record.

---

## Admin Endpoints (Admin Role Required)

### GET /api/knowledge/documents
Query params: `?status=ACTIVE IN RAG&category=Services`

### POST /api/knowledge/documents
**Body:**
```json
{
  "title": "Zyngram Autonomous Dispatch Directives",
  "category": "Policies",
  "content": "Full markdown content...",
  "version": "1.1",
  "status": "DRAFT"
}
```

### PUT /api/knowledge/documents/:id/status
**Body:** `{ "status": "ACTIVE IN RAG" }` — promotes through lifecycle.

### POST /api/knowledge/reindex
Triggers re-ingestion of all knowledge-base files from disk.

### DELETE /api/knowledge/documents/:id
Permanently removes document and its indexed chunks.

### GET /api/monitoring/metrics
Query params: `?startDate=2026-01-01&endDate=2026-10-09`  
Returns all dashboard metrics from actual database records.

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Missing or no token provided |
| INVALID_TOKEN | 401 | Expired or malformed JWT |
| FORBIDDEN | 403 | Insufficient role (admin required) |
| NOT_FOUND | 404 | Resource not found or access denied |
| VALIDATION_ERROR | 400 | Missing or invalid request fields |
| PAYLOAD_TOO_LARGE | 400 | Message exceeds 2000 characters |
| RATE_LIMIT_EXCEEDED | 429 | Too many API requests |
| AUTH_RATE_LIMIT_EXCEEDED | 429 | Too many login attempts |
| SERVER_ERROR | 500 | Internal server error (no stack trace in response) |
