# Deployment and Staging Guide

**Document Version:** 1.0.0  
**Associated Task:** `TASK-039`  
**Target Audience:** DevOps, Platform Engineers, System Administrators

---

## 1. Environment Configurations

Production secrets must never be committed to git or exposed in client bundles. Configure runtime environment variables using the provided `.env.example` as a template.

### Required Server Variables

| Variable | Staging Default | Production Required | Description |
|---|---|---|---|
| `NODE_ENV` | `staging` | `production` | Node environment runtime mode. |
| `PORT` | `4000` | Port assigned by host (e.g. `8080` / `443`) | Server listening port. |
| `SUPABASE_URL` | Staging project URL | Production project URL | Supabase PostgreSQL API endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging secret | Production secret | High-privilege key (server-only). |
| `JWT_SECRET` | 32+ character key | 64+ character random secret | HMAC signing key for expiring tokens. |
| `CORS_ORIGIN` | `https://staging.kurukshetra.edu` | `https://portal.kurukshetra.edu` | Whitelisted browser origin(s). |

---

## 2. Ordered Database Migrations

Apply database migrations sequentially against the target PostgreSQL / Supabase project.

### Migration Sequence (`supabase/migrations/`)

1. `0001_initial_core.sql` — Profiles, courses, enrollments, concepts.
2. `0002_rls_policies.sql` — Row level security policies and ownership checks.
3. `0003_syllabus_and_resources.sql` — Course syllabi, learning modules, resources.
4. `0004_question_bank_and_assessments.sql` — Questions, versions, test series, assessments.
5. `0005_test_series_and_attempts.sql` — Assessment attempts, question snapshots, candidate answers.
6. `0006_async_jobs.sql` — Asynchronous jobs queue and worker lease state.
7. `0007_mastery_and_recommendations.sql` — BKT student mastery, learning attempts, recommendations.
8. `0008_coding_and_execution.sql` — Coding sessions, telemetry events, test cases.
9. `0009_submission_results.sql` — Coding submissions and test execution outputs.
10. `0010_ai_viva_and_integrity.sql` — AI viva sessions, rubrics, integrity signals, human review.
11. `0011_reports_and_audit.sql` — Authorized exports, expiring download tokens, audit trail.

### Verifying and Applying Migrations

```bash
# Verify all migration files are in sequential order (dry-run):
npm run migrate

# Apply migrations using Supabase CLI:
supabase db push
# or using psql:
psql "$DATABASE_URL" -f supabase/migrations/0001_initial_core.sql
# ... through 0011_reports_and_audit.sql
```

---

## 3. Post-Deployment Smoke Verification

Immediately following deployment or staging promotion, run the automated non-destructive smoke test:

```bash
npm run smoke
```

The smoke test validates:
- Liveness probe (`/health`) returns 200 with operational memory telemetry.
- Readiness probe (`/readiness`) verifies PostgreSQL and worker connection.
- Helmet security headers (`X-Content-Type-Options: nosniff`) are enforced.
- Protected endpoints (`/api/v1/me/dashboard`) reject unauthenticated traffic with 401.
- Error sanitization prevents leaking stack traces on 404 or 500 responses.

---

## 4. Rollback and Disaster Recovery

If the post-deployment smoke test fails:
1. **Container / Service Rollback:** Immediately revert the container image or deployment revision to the previous known good SHA.
2. **Database Rollback:** If migration rollback is required, use point-in-time recovery (PITR) to restore PostgreSQL state to immediately prior to migration execution.
3. **Secret Invalidation:** If an API secret is suspected of exposure during deploy, rotate it immediately in the cloud secret manager and restart application instances.
