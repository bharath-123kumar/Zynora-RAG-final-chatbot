# Local Development Setup Guide

## Requirements

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | ≥ 18 (v24 recommended) | `node -v` |
| npm | ≥ 9 | `npm -v` |
| PowerShell | Any | (default on Windows) |
| Git | Any recent | `git --version` |
| PostgreSQL | Optional (SQLite auto-used if absent) | `psql --version` |

---

## Step-by-Step Local Setup

### Step 1: Clone or Navigate to Project

```powershell
# If using Git:
git clone https://github.com/YOUR_USERNAME/zynora-rag-chatbot.git
cd "zynora-rag-chatbot"

# OR — if files already exist:
cd "c:\Antigravity\Zynora RAG Final Chatbot"
```

### Step 2: Install All Dependencies

```powershell
npm run install:all
```

This runs:
1. `npm install` (root scripts)
2. `npm install --prefix backend` (backend packages)
3. `npm install --prefix frontend` (frontend packages)

Alternatively, step by step:
```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Step 3: Verify Configuration

```powershell
type backend\.env
```

Confirm these values are correct for local dev:
```
PORT=5000
NODE_ENV=development
DATABASE_URL=         ← leave blank for auto-SQLite
JWT_SECRET=zynora_secret_jwt_key_super_secure_32_characters_min
CORS_ORIGIN=http://localhost:3000
```

### Step 4: Initialize Database & Knowledge Base

```powershell
npm run setup
```

This runs sequentially:
1. `node scripts/setup_db.js` — applies SQL migrations, creates all tables
2. `node scripts/seed_knowledge.js` — imports 5 approved knowledge documents + demo users

Expected output:
```
✅ Migration 001_init_schema.sql applied
✅ Migration 002_indexes.sql applied
✅ Users seeded (admin + standard user)
✅ Knowledge documents ingested: 5 documents, 42 chunks indexed
```

### Step 5: Start the Application

```powershell
npm run dev
```

You should see:
```
[backend]  ✅ Zynora API server running on port 5000
[frontend]  ➜  Local:   http://localhost:3000/
```

### Step 6: Verify Everything Works

Open: **http://localhost:3000**

1. You should see the Zynora login screen
2. Login with `admin@zyngram.com` / `Admin@Zynora2026!`
3. Navigate to Chat — ask: *"What is Zyngram?"*
4. You should receive a grounded answer with source citations
5. Navigate to Admin panel — verify 5 knowledge documents are listed

### Step 7: Run Automated Tests

```powershell
# Run all 60 tests (backend must be running on port 5000)
node tests/testRunner.js
```

Expected output:
```
✅ RAG Suite:      40/40 Passed
✅ Security Suite: 10/10 Passed
✅ API Suite:      10/10 Passed
🎉 60/60 PASSED
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite dev) | 3000 | http://localhost:3000 |
| Backend (Express) | 5000 | http://localhost:5000 |
| Backend health | 5000 | http://localhost:5000/health |

---

## Common Issues

### Backend fails to start: "Port 5000 in use"
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID_FROM_ABOVE> /F
```

### Frontend proxy error (Cannot connect to API)
Verify `frontend/vite.config.js` proxy target is `http://localhost:5000`.

### "node:sqlite" module errors
Ensure Node.js version is 22 or higher. Run `node -v`.

### Database tables missing
```powershell
# Reset and re-initialize:
Remove-Item backend\data\zynora.db -Force
node scripts/setup_db.js
node scripts/seed_knowledge.js
```

### Knowledge documents not showing in chat
Re-run the seed script. Check `knowledge_documents` table status is `ACTIVE IN RAG`.

### Tests fail with 401 Unauthorized
Confirm the demo users were seeded. If not, run:
```powershell
node backend/src/db/seeds/seed.js
```
