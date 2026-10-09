# Production Verification Checklist — Zynora RAG Chatbot

## Pre-Release Checklist (Complete BEFORE deploying to production)

### Code Quality
- [ ] All 60 automated tests pass locally: `node tests/testRunner.js`
- [ ] No `console.log` debugging statements in production code
- [ ] No hardcoded credentials or API keys in source files
- [ ] `.env` is confirmed absent from Git history
- [ ] `node_modules/`, `dist/`, `data/` are all git-ignored

### Configuration
- [ ] `NODE_ENV=production` set in production environment variables
- [ ] `JWT_SECRET` is ≥32 random characters, unique to production
- [ ] `DATABASE_URL` points to PostgreSQL (Render managed DB)
- [ ] `CORS_ORIGIN` set to exact Vercel domain (no trailing slash)
- [ ] All environment variables set in Render/Vercel — NOT in committed files

### Database
- [ ] All migrations applied successfully (check deployment logs for ✅)
- [ ] Seed script run once (creates admin user + 5 knowledge documents)
- [ ] Admin user role confirmed: `SELECT role FROM users WHERE email='admin@zyngram.com'` → `admin`
- [ ] Knowledge document count: `SELECT COUNT(*) FROM knowledge_documents WHERE status='ACTIVE IN RAG'` → 5

---

## Post-Deployment Verification (After each deployment)

### Layer 1: Infrastructure Health
```
GET /health
Expected: { "status": "UP", "checks": { "database": { "status": "healthy" } } }
```

### Layer 2: Authentication
```
POST /api/auth/login
Body: { "email": "admin@zyngram.com", "password": "Admin@Zynora2026!" }
Expected: 200 with token (change password after first production login)
```

### Layer 3: RAG Core Functionality
```
POST /api/zynora/chat
Body: { "message": "What is Zyngram?" }
Expected: { "grounded": true, "sources": [...], "confidenceIndicator": > 0.5 }
```

### Layer 4: RAG Fallback
```
POST /api/zynora/chat
Body: { "message": "What is the GDP of France?" }
Expected: { "answer": "I couldn't find this information in the approved Zyngram knowledge base.", "grounded": false }
```

### Layer 5: Admin Operations
```
GET /api/knowledge/documents
Headers: Authorization: Bearer <admin-token>
Expected: 200 with array of 5 documents
```

### Layer 6: Security
```
GET /api/knowledge/documents
Headers: Authorization: Bearer <user-token-not-admin>
Expected: 403 FORBIDDEN
```

### Layer 7: Monitoring Dashboard
```
GET /api/monitoring/metrics
Headers: Authorization: Bearer <admin-token>
Expected: 200 with metrics object (totals, grounding rates, etc.)
```

### Layer 8: Frontend UI (Manual)
- [ ] Login page renders at Vercel URL
- [ ] Login with admin credentials works
- [ ] Chat page: send a message and receive a grounded answer
- [ ] Source cards display with correct document titles
- [ ] Admin panel: knowledge documents table loads
- [ ] Status lifecycle buttons work (DRAFT → APPROVED → ACTIVE IN RAG)
- [ ] Monitoring dashboard: metrics and charts render
- [ ] Logout works and redirects to login

---

## Performance Benchmarks (Acceptable Ranges)

| Metric | Target | Warning |
|--------|--------|---------|
| /health response time | < 200ms | > 500ms |
| RAG chat response time | < 500ms | > 2000ms |
| Login response time | < 500ms | > 1000ms |
| Frontend initial load | < 3s | > 5s |

---

## Smoke Test Script

Run this after every deployment:

```powershell
$BASE_URL = "https://zynora-rag-chatbot-backend.onrender.com"

# Health check
$health = Invoke-RestMethod -Uri "$BASE_URL/health"
Write-Host "Health: $($health.status)"

# Login
$login = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@zyngram.com","password":"Admin@Zynora2026!"}'
$token = $login.token
Write-Host "Login: $(if($token){'✅ OK'}else{'❌ FAILED'})"

# RAG Chat
$chat = Invoke-RestMethod -Uri "$BASE_URL/api/zynora/chat" -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"message":"What is Zyngram?"}'
Write-Host "RAG Chat Grounded: $($chat.grounded)"
Write-Host "Sources: $($chat.sources.Count)"

Write-Host "✅ Smoke test complete"
```

---

## Go/No-Go Decision Matrix

| Check | GO | NO-GO |
|-------|-----|-------|
| All 60 tests pass | ✅ | ❌ Fix and retest |
| `/health` returns UP | ✅ | ❌ Roll back |
| Login works | ✅ | ❌ Check JWT_SECRET |
| RAG returns grounded answer | ✅ | ❌ Check knowledge seeding |
| Admin panel accessible | ✅ | ❌ Check admin role in DB |
| Fallback works for unknown queries | ✅ | ❌ Check RAG threshold config |
| No secrets in git history | ✅ | ❌ Rotate secrets immediately |

**If ANY check is NO-GO: Do not proceed. Investigate and fix before production traffic.**
