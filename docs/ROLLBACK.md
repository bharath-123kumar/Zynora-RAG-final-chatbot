# Rollback Procedures — Zynora RAG Chatbot

## When to Roll Back

Roll back if any of these occur after a production deployment:
- `/health` endpoint returns status 503 or 500
- Login or registration returns 500 errors
- RAG chat answers stop including sources or hallucinate
- Database migration errors in deployment logs
- 20%+ increase in error rate in Render logs

---

## Render Backend Rollback (< 2 minutes)

### Option A: Render Dashboard (Recommended)

1. Go to Render → Your Web Service → **Deploys** tab
2. Find the last known-good deploy (look for the green ✅)
3. Click the three-dot menu → **Rollback to this deploy**
4. Confirm rollback — Render will re-deploy the previous build instantly
5. Verify health: `GET /health` returns `200 UP`

### Option B: Git Revert + Push

```powershell
# Find the last working commit hash
git log --oneline -10

# Revert to specific commit (creates a new revert commit)
git revert <bad-commit-hash>
git push origin main

# OR hard reset to last good state (only on private repos — rewrites history)
git reset --hard <last-good-hash>
git push origin main --force
```

---

## Vercel Frontend Rollback (< 2 minutes)

### Option A: Vercel Dashboard (Recommended)

1. Go to Vercel → Your Project → **Deployments** tab
2. Find the last successful deployment
3. Click the three-dot menu → **Promote to Production**
4. Previous stable version is instantly live

### Option B: Git Revert (Same as Backend)

```powershell
git revert <bad-frontend-commit>
git push origin main
```

Vercel auto-deploys on every push to `main`.

---

## Database Rollback

> ⚠️ Database rollbacks are higher risk. Follow these procedures carefully.

### Scenario A: Migration Failed Mid-Way (Render PostgreSQL)

```sql
-- Connect via Render shell or psql
-- Check which migrations were applied
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- Drop tables created by failed migration (example for 002_indexes)
DROP INDEX IF EXISTS idx_knowledge_chunks_doc_id;
DROP INDEX IF EXISTS idx_source_references_message_id;

-- Manually remove the migration record so it can be re-applied
DELETE FROM schema_migrations WHERE filename = '002_indexes.sql';
```

Then fix the migration file and redeploy.

### Scenario B: Data Corruption (Nuclear Option)

1. On Render → Your PostgreSQL → **Backups** tab
2. Click **Restore from Backup** → select a backup point before the issue
3. After restore, set the correct environment variable for the restored database URL
4. Redeploy backend service

---

## Emergency Environment Variable Change

If a bad config value was deployed (e.g., wrong JWT_SECRET):

1. Render → Web Service → **Environment** tab
2. Update the variable value
3. Click **Save Changes** — Render auto-restarts with the new value (< 30 seconds)
4. Verify by hitting `/health`

---

## Post-Rollback Verification Checklist

Run these checks after any rollback:

- [ ] `GET /health` → 200, `status: "UP"`, database healthy
- [ ] `POST /api/auth/login` → 200 with token
- [ ] `GET /api/auth/me` with token → 200 with user profile
- [ ] `POST /api/zynora/chat` with known question → grounded answer with sources
- [ ] `GET /api/knowledge/documents` (admin token) → 200 with documents
- [ ] Frontend at Vercel URL → login page renders correctly
- [ ] Admin panel → knowledge documents list loads
- [ ] Monitoring dashboard → metrics load without error

---

## Rollback Decision Tree

```
Is /health returning 200?
├── NO → Check Render logs → Database issue? → Restore DB backup
│            → Application crash? → Rollback to last deploy
└── YES → Is chat working?
          ├── NO → Check RAG/knowledge seeding → re-run seed.js
          └── YES → Is admin panel working?
                    ├── NO → Check user role in DB (admin@zyngram.com should have role='admin')
                    └── YES → All systems operational ✅
```
