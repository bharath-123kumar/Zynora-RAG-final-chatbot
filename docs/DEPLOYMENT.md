# Production Deployment Guide — Zynora RAG Chatbot

## Deployment Architecture

```
GitHub Repo
    ├── /backend  →  Render Web Service (Node.js)
    │                  ↕
    │              Render PostgreSQL (managed DB)
    └── /frontend →  Vercel (Static CDN)
```

---

## Pre-Deployment Checklist

- [ ] All 60 automated tests pass locally: `node tests/testRunner.js`
- [ ] `backend/.env` is NOT committed (check `.gitignore`)
- [ ] `node_modules/` is NOT committed
- [ ] `backend/data/zynora.db` (SQLite) is NOT committed
- [ ] `frontend/dist/` is NOT committed
- [ ] GitHub repository created and all code pushed to `main` branch
- [ ] Production JWT_SECRET generated (minimum 32 characters, random)

---

## Part 1: Deploy Backend to Render

### 1.1 Create a Render Account
Go to https://render.com and sign up.

### 1.2 Create a PostgreSQL Database
1. Click **New → PostgreSQL**
2. Name: `zynora-db`
3. Region: choose closest to your users
4. Plan: Free (development) or Starter (production)
5. Click **Create Database**
6. Copy the **Internal Database URL** (starts with `postgresql://`)

### 1.3 Create a Web Service
1. Click **New → Web Service**
2. Connect your GitHub repository
3. Set these Build settings:

| Field | Value |
|-------|-------|
| Root Directory | `backend` |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `node server.js` |

### 1.4 Set Environment Variables

In your Render web service → **Environment** tab, add:

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| PORT | 10000 |
| JWT_SECRET | *(generate a strong 32+ char secret)* |
| DATABASE_URL | *(your Render PostgreSQL Internal URL)* |
| CORS_ORIGIN | *(your Vercel URL, e.g. https://zynora.vercel.app)* |
| APP_VERSION | 1.0.0 |
| RAG_SIMILARITY_THRESHOLD | 0.22 |
| RAG_MAX_CHUNKS | 4 |
| KNOWLEDGE_BASE_DIR | ./knowledge-base |

**Generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.5 Deploy
1. Click **Create Web Service**
2. Monitor the deployment logs
3. Verify at: `https://zynora-rag-chatbot-backend.onrender.com/health`

Expected response:
```json
{
  "status": "UP",
  "checks": {
    "database": { "status": "healthy", "engine": "postgres" }
  }
}
```

---

## Part 2: Deploy Frontend to Vercel

### 2.1 Create a Vercel Account
Go to https://vercel.com and sign up.

### 2.2 Import GitHub Repository
1. Click **Add New → Project**
2. Import your GitHub repo
3. Set Framework Preset: **Vite**

### 2.3 Set Build Settings

| Field | Value |
|-------|-------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 2.4 Set Environment Variables

| Variable | Value |
|----------|-------|
| VITE_API_BASE_URL | `https://zynora-rag-chatbot-backend.onrender.com` |

### 2.5 Deploy
1. Click **Deploy**
2. Vercel builds and deploys automatically
3. Your frontend is live at `https://zynora-rag-chatbot.vercel.app` (or similar)

---

## Part 3: Post-Deployment Verification

### Test 1: Health Check
```powershell
curl https://zynora-rag-chatbot-backend.onrender.com/health
```

### Test 2: Authentication
```powershell
curl -X POST https://zynora-rag-chatbot-backend.onrender.com/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@zyngram.com","password":"Admin@Zynora2026!"}'
```
Expect 200 with JWT token.

### Test 3: RAG Chat (use token from Test 2)
```powershell
curl -X POST https://zynora-rag-chatbot-backend.onrender.com/api/zynora/chat `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <token>" `
  -d '{"message":"What is Zyngram?"}'
```
Expect grounded answer with sources.

### Test 4: Frontend UI
1. Open your Vercel URL in browser
2. Login with admin credentials
3. Confirm chat, admin panel, and monitoring dashboard all load

---

## Part 4: Custom Domain (Optional)

### Render (backend)
1. Go to Settings → Custom Domain
2. Add your API subdomain: `api.zynora.com`
3. Update DNS CNAME record at your domain provider

### Vercel (frontend)
1. Go to Project Settings → Domains
2. Add your domain: `zynora.com`
3. Update DNS records as Vercel instructs

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml` for automatic deploys on push to `main`:

```yaml
name: Zynora CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm install --prefix backend
      - run: node tests/ragEvaluationSuite.js
        env:
          NODE_ENV: test
          JWT_SECRET: test_jwt_secret_for_ci_only

  # Render and Vercel auto-deploy from GitHub — no additional steps needed
  notify:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: echo "✅ Tests passed — Render and Vercel deploying automatically"
```
