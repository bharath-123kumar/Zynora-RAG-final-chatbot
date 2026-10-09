# Zynora AI RAG Chatbot — Complete Project README

<div align="center">
  <h1>⚡ Zynora — Zyngram Internal RAG Chatbot</h1>
  <p><strong>Zero external LLM · 100% Grounded Answers · Enterprise Knowledge Governance</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-24.x-green?logo=node.js" alt="Node.js">
    <img src="https://img.shields.io/badge/React-19.x-blue?logo=react" alt="React">
    <img src="https://img.shields.io/badge/RAG-Local%20Hybrid%20BM25%2BVector-purple" alt="RAG">
    <img src="https://img.shields.io/badge/Tests-60%2F60%20Passed-brightgreen" alt="Tests">
    <img src="https://img.shields.io/badge/License-UNLICENSED-red" alt="License">
  </p>
</div>

---

## 📋 Project Overview

**Zynora** is a production-grade, enterprise internal Retrieval-Augmented Generation (RAG) chatbot for Zyngram Technologies Inc. It answers strictly from approved, versioned, lifecycle-governed knowledge documents — with zero external API calls.

**Complies with:** Zyngram AI Engineer Trainee Assignments — Day 11, 12, 13, and 14.

---

## ✅ What Works (Verified by Automated Tests)

| Suite | Tests | Passed | Rate |
|-------|-------|--------|------|
| RAG Evaluation (Direct, Contextual, Absent, Ambiguous, Adversarial) | 40 | 40 | **100%** |
| Security & Authorization | 10 | 10 | **100%** |
| API Integration & Lifecycle | 10 | 10 | **100%** |
| **Total** | **60** | **60** | **100%** |

---

## 🏗️ Project Structure

```
zynora/
├── backend/                    # Node.js + Express.js API & RAG Engine
│   ├── server.js               # Entry point (auto-migrates & seeds on first run)
│   ├── src/
│   │   ├── app.js              # Express app, routes, middleware
│   │   ├── config/env.js       # Environment configuration
│   │   ├── controllers/        # authController, chatController, conversationController,
│   │   │                         knowledgeController, monitoringController, healthController
│   │   ├── db/
│   │   │   ├── dbClient.js     # PostgreSQL + auto-fallback SQLite (node:sqlite)
│   │   │   ├── migrations/     # 001_init_schema.sql, 002_indexes.sql, migrate.js
│   │   │   └── seeds/seed.js   # Demo users + approved knowledge ingest
│   │   ├── middleware/         # authMiddleware, rateLimiter, requestValidator,
│   │   │                         structuredLogger, errorMiddleware
│   │   ├── rag/
│   │   │   ├── documentIngestor.js    # TXT/MD/JSON → clean → chunk → store
│   │   │   ├── textCleaner.js         # Unicode/markdown normalization
│   │   │   ├── textSplitter.js        # Section-aware semantic chunking
│   │   │   ├── vectorEngine.js        # Local BM25 + Cosine hybrid retrieval
│   │   │   ├── contextResolver.js     # Multi-turn follow-up resolution
│   │   │   └── groundedSynthesizer.js # Extractive synthesis + grounding verifier
│   │   ├── routes/             # healthRoutes, authRoutes, chatRoutes,
│   │   │                         conversationRoutes, knowledgeRoutes, monitoringRoutes
│   │   └── utils/logger.js     # Structured JSON logger w/ sanitization
│   └── logs/                   # app.log (auto-created, never committed)
│
├── frontend/                   # React 19 + Vite + React Router
│   ├── src/
│   │   ├── App.jsx             # Router + ProtectedRoute wrappers
│   │   ├── context/AuthContext.jsx   # JWT auth state provider
│   │   ├── api/                # client.js, authApi, chatApi, conversationApi,
│   │   │                         knowledgeApi, monitoringApi
│   │   ├── pages/              # LoginPage, RegisterPage, ChatPage, AdminPage
│   │   ├── components/         # Sidebar, MessageBubble, SourceCard, Modal,
│   │   │                         KnowledgeManager, MonitoringDashboard
│   │   └── styles/             # index.css, chat.css, auth.css, admin.css
│   └── dist/                   # Production build output (git-ignored)
│
├── knowledge-base/
│   ├── approved/               # Active knowledge: .md, .txt, .json documents
│   │   ├── zyngram_overview.md
│   │   ├── zyngram_franchise_structure.md
│   │   ├── zyngram_services.md
│   │   ├── zyngram_policies.md
│   │   └── zyngram_faq.json
│   ├── drafts/                 # DRAFT (excluded from RAG)
│   └── archived/               # ARCHIVED (excluded from RAG)
│
├── scripts/
│   ├── run_dev.js              # Starts backend + frontend concurrently
│   ├── setup_db.js             # Run migrations only
│   └── seed_knowledge.js       # Ingest knowledge documents
│
├── tests/
│   ├── testRunner.js           # Master 60-test runner
│   ├── ragEvaluationSuite.js   # 40-case RAG quality evaluation
│   ├── security.test.js        # 10-case security & auth suite
│   └── apiIntegration.test.js  # 10-case API lifecycle suite
│
├── docs/                       # Architecture, API, Schema, Security docs
├── .env.example                # Safe placeholder configuration template
├── .gitignore                  # Excludes .env, node_modules, build, secrets
├── package.json                # Root orchestration scripts
└── README.md
```

---

## ⚙️ Quick Start (Windows — VS Code Terminal)

### 1. Prerequisites

```powershell
node -v          # Must be >= 18 (v24 recommended)
npm -v           # Must be >= 9
git --version    # Any recent version
```

> **PostgreSQL is optional for local development.**  
> If `DATABASE_URL` is left blank, the application automatically uses a persistent local SQLite database (`backend/data/zynora.db`).

### 2. Install Dependencies

```powershell
# Install root, backend, and frontend packages together
npm run install:all

# OR install separately:
npm install                              # root
npm install --prefix backend             # backend
npm install --prefix frontend            # frontend
```

### 3. Configure Environment Variables

```powershell
# Backend .env (already pre-configured for local dev)
# Just verify it exists:
type backend\.env

# For production — copy .env.example and set your values:
Copy-Item .env.example backend\.env
# Then edit backend\.env with your production JWT_SECRET and DATABASE_URL
```

### 4. Initialize Database & Knowledge Base

```powershell
# Option A: Full automated setup (migrations + seed)
npm run setup

# Option B: Step by step
node scripts/setup_db.js          # Run schema migrations
node scripts/seed_knowledge.js    # Import knowledge + demo users
```

### 5. Start the Application

```powershell
# Start BOTH backend and frontend together
npm run dev

# OR start separately (2 terminals):
# Terminal 1 — Backend:
npm run dev:backend

# Terminal 2 — Frontend:
npm run dev:frontend
```

**URLs:**
| Service | Address |
|---------|---------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/health |
| API Version | http://localhost:5000/api/version |

---

## 🔑 Demo Credentials (Auto-Seeded)

| Role | Email | Password |
|------|-------|---------|
| **Admin** (Knowledge + Monitoring) | `admin@zyngram.com` | `Admin@Zynora2026!` |
| **Standard Operator** | `user@zyngram.com` | `User@Zynora2026!` |

---

## 🧪 Running Tests

```powershell
# Run all 60 automated tests (from project root):
node tests/testRunner.js

# Or individual suites:
node tests/ragEvaluationSuite.js     # 40 RAG quality tests
node tests/security.test.js          # 10 security + auth tests
node tests/apiIntegration.test.js    # 10 API lifecycle tests
```

### Test Results Summary

```
✅ RAG Suite:      40/40 Passed (100%)
✅ Security Suite: 10/10 Passed (100%)
✅ API Suite:      10/10 Passed (100%)
🎉 Total: 60/60 Passed — ZERO DEFECTS
```

---

## 🤖 RAG Pipeline Architecture

```
User Question
    ↓
[1] Prompt Injection Defense (regex pattern matching)
    ↓
[2] Context Resolver (multi-turn follow-up disambiguation)
    ↓
[3] Hybrid Retrieval: BM25 + Cosine Vector Similarity
    ↓
[4] Approved-Status Filter (ACTIVE IN RAG | APPROVED only)
    ↓
[5] Term Coverage Check (≥30% unique query tokens matched)
    ↓
[6] Grounded Synthesizer (extractive answer from top chunks)
    ↓
[7] Grounding Verification (≥70% answer-context token overlap)
    ↓
[8] Source Attribution (document title, category, section, score)
    ↓
Response (answer + sources + confidence) OR Exact Fallback
```

**Fallback message (exact, always used when evidence is insufficient):**
> `"I couldn't find this information in the approved Zyngram knowledge base."`

---

## 🔒 Security Architecture

- ✅ JWT authentication with secret-key signing (RS256-compatible configuration)
- ✅ bcryptjs password hashing (configurable salt rounds)
- ✅ Role-based authorization (user vs. admin routes)
- ✅ Conversation ownership enforcement on every backend operation
- ✅ Cross-user conversation isolation (backend-enforced, never frontend-only)
- ✅ Expired and invalid token rejection (401 responses)
- ✅ SQL injection resistance via parameterized queries only
- ✅ Rate limiting on API (100 req/15min) and auth endpoints (20 req/15min)
- ✅ Input validation on all user-supplied fields
- ✅ Request payload size limit (1MB)
- ✅ Prompt-injection regex deflection at RAG retrieval layer
- ✅ Sensitive credentials excluded from all logs
- ✅ Stack traces never exposed to end users

---

## 🚀 Production Deployment (Render + Vercel)

### Backend on Render

1. Go to [https://render.com](https://render.com) and create a new **Web Service**
2. Connect your GitHub repository
3. Configure the service:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
4. Set Environment Variables in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=<generate a strong random secret, min 32 characters>
   DATABASE_URL=<your Render PostgreSQL connection string>
   CORS_ORIGIN=<your Vercel frontend URL>
   APP_VERSION=1.0.0
   RAG_SIMILARITY_THRESHOLD=0.22
   RAG_MAX_CHUNKS=4
   KNOWLEDGE_BASE_DIR=./knowledge-base
   ```
5. Add a **PostgreSQL** database on Render and use the internal connection URL
6. Verify at: `https://zynora-rag-chatbot-backend.onrender.com/health`

### Frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Set Environment Variable:
   ```
   VITE_API_BASE_URL=https://zynora-rag-chatbot-backend.onrender.com
   ```
5. Redeploy and verify login works end-to-end

---

## 🌿 GitHub Setup

```powershell
# Initialize Git (from project root)
git init

# Add all files (respects .gitignore — excludes .env, node_modules, dist, data)
git add .

# First commit
git commit -m "feat: complete Zynora AI RAG Chatbot - 60/60 tests passing"

# Connect to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/zynora-rag-chatbot.git

# Push to main branch
git push -u origin main
```

> ⚠️ **NEVER push `.env` files.** The `.gitignore` excludes them by default.

---

## 🔬 Troubleshooting

| Issue | Fix |
|-------|-----|
| `EADDRINUSE: port 5000` | Run `netstat -ano \| findstr :5000`, then `taskkill /PID <PID> /F` |
| Frontend can't reach backend | Confirm `vite.config.js` proxy points to `http://localhost:5000` |
| `DATABASE_URL` errors | Leave it blank in `.env` to use auto-SQLite; PostgreSQL is optional locally |
| Migration errors | Delete `backend/data/zynora.db` and re-run `node scripts/setup_db.js` |
| Knowledge not retrieved | Run `node scripts/seed_knowledge.js` to reingest approved documents |
| Token expired errors | Log out and log back in to obtain a fresh JWT token |
| CORS errors in browser | Ensure `CORS_ORIGIN=http://localhost:3000` is set in backend `.env` |

---

## 📄 Documentation

| Document | Location |
|----------|---------|
| Architecture | `docs/ARCHITECTURE.md` |
| API Documentation | `docs/API_DOCUMENTATION.md` |
| Database Schema | `docs/DATABASE_SCHEMA.md` |
| Local Setup | `docs/LOCAL_SETUP.md` |
| Deployment Guide | `docs/DEPLOYMENT.md` |
| Rollback Procedures | `docs/ROLLBACK.md` |
| Security Policy | `docs/SECURITY.md` |
| Testing Strategy | `docs/TESTING.md` |
| RAG Evaluation | `docs/RAG_EVALUATION.md` |
| Production Verification | `docs/PRODUCTION_VERIFICATION.md` |

---

## ⚡ Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Database (local) | node:sqlite (built-in Node 22+) | Zero install, persistent, parameterized queries |
| Database (production) | PostgreSQL via pg | Persistent, ACID-compliant, Render-supported |
| RAG retrieval | Local BM25 + Cosine hybrid | No external API, accurate, interpretable |
| Answer generation | Extractive synthesizer | No hallucination risk, fully grounded |
| Frontend bundler | Vite | Node 24 compatible, fast builds |
| JWT | jsonwebtoken | Battle-tested, configurable expiry |
| Password hashing | bcryptjs | No native dependency, cross-platform |

---

## ⚠️ Known Limitations

1. **No streaming responses** — answers return complete; streaming requires SSE/WebSocket
2. **SQLite not for production** — use `DATABASE_URL` with PostgreSQL on Render
3. **Extractive RAG only** — answers are extracted from documents; no LLM generative synthesis
4. **Knowledge base must be re-indexed** after adding new files via Admin panel or `/api/knowledge/reindex`
5. **Rate limiting resets on restart** — uses in-memory store; configure Redis for distributed setups

---

*Zynora RAG Chatbot v1.0.0 — Zyngram AI Engineering Team*
