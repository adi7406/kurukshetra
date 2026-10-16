# Environment & Configuration Guide

**Project:** Adaptive Learning and Assessment Portal  
**Document:** `ENVIRONMENT.md`  
**Status:** Proposed baseline — confirm exact names and versions against the repository before implementation.

This document defines the local development setup, environment-variable conventions, external-service configuration, and deployment safeguards for the Adaptive Learning and Assessment Portal.

> **Important:** This is a configuration contract, not a claim that every integration is already implemented. Keep this file aligned with `PRD.md`, `AGENT.md`, `ARCHITECTURE.md`, `DATABASE.md`, and `API_SPEC.md`.

---

## 1. Configuration Principles

1. **Never commit secrets.** Do not commit `.env`, service-role keys, database passwords, AI provider keys, signing secrets, or private certificates.
2. **Provide safe examples.** Commit `.env.example` files containing variable names and non-secret placeholders only.
3. **Validate at startup.** The backend must fail fast with a clear message when a required variable is missing or malformed. Never print its value.
4. **Separate client and server configuration.** Only explicitly public values may be bundled into the browser application.
5. **Use least privilege.** Give each environment and service only the permissions it requires.
6. **Keep environments separate.** Local, test, preview/staging, and production must use separate credentials and data resources where possible.
7. **Avoid hidden defaults for security-sensitive settings.** Missing authentication, database, or execution-service configuration must not silently disable security.
8. **Document changes.** When adding or renaming a variable, update this document, the relevant `.env.example`, validation code, and deployment settings.

## 2. Environments

| Environment | Purpose | Data and credentials | Deployment expectations |
|---|---|---|---|
| Local development | Developer workstation | Local/test accounts and non-production data | Debug logging allowed; no production secrets |
| Automated test | Unit, integration, and end-to-end tests | Disposable test database and test provider credentials | Deterministic tests; external calls mocked where appropriate |
| Preview/staging | Review changes before release | Separate Supabase project or isolated schema/data | Production-like settings; test-only users and content |
| Production | Real users | Production database, storage, and provider credentials | Debug disabled; strict access controls, monitoring, backups, and rate limits |

Never copy production student records into local development unless a formally approved, privacy-safe process has been established.

## 3. Suggested Runtime Baseline

Confirm these versions against the actual repository and hosting provider before pinning them:

- **Frontend:** React + Vite (JavaScript), running on a supported Node.js LTS release.
- **Backend:** Node.js + Express (JavaScript).
- **Database and identity:** Supabase PostgreSQL and Supabase Auth, with Row Level Security (RLS) enabled on exposed tables.
- **File storage:** Supabase Storage or another explicitly selected private object-storage provider.
- **AI services:** Provider adapter(s) configured through server-side credentials.
- **Code execution:** Judge0 or an equivalent isolated execution service; never run untrusted student code inside the Express application process.
- **Hosting:** Select frontend and backend hosts deliberately; configure environment variables separately for each deployment target.

Use the lockfile as the source of truth for package versions. Do not upgrade major dependencies as an unrelated part of a feature task.

## 4. Environment Files

A recommended repository layout is:

```text
project-root/
├── .gitignore
├── .env.example                 # Shared names only, if one root environment is used
├── client/
│   ├── .env.example             # Vite-exposed variables only
│   └── ...
├── server/
│   ├── .env.example             # Server-only variables
│   └── ...
├── docs/
│   └── ENVIRONMENT.md           # Or keep this file at the repository root
└── ...
```

Adapt the folder names to the actual repository. If frontend and backend are separate repositories, keep a separate example file and setup instructions in each repository.

### Local setup

1. Install the repository's required Node.js version and package manager.
2. Install dependencies using the committed lockfile, for example `npm ci` where npm is used.
3. Copy the appropriate `.env.example` to `.env` in each application directory.
4. Fill in local/test credentials using the provider dashboards or local service setup.
5. Apply database migrations to the intended development database.
6. Start the frontend and backend using the scripts defined in their `package.json` files.
7. Verify health checks and confirm that no secrets are exposed in browser bundles or logs.

Do not assume a command exists until it has been confirmed in the repository's `package.json`.

## 5. Variable Naming and Exposure

- Use descriptive uppercase names such as `SUPABASE_URL` and `AI_PROVIDER_API_KEY`.
- Variables beginning with `VITE_` are exposed to frontend code and must be treated as **public**. Never place private credentials in a `VITE_` variable.
- Backend secrets must be read only by server-side code.
- Avoid defining the same variable with conflicting values in multiple places. Document which application consumes each variable.
- Use explicit booleans (`true`/`false`) and validate numeric limits as positive integers or valid ranges.
- Do not log complete environment objects, connection strings, authorization headers, or secret-bearing URLs.

## 6. Frontend Variables

Create `client/.env.example` (or the equivalent in the actual frontend directory). Only add variables the frontend truly needs.

| Variable | Required | Purpose | Exposure |
|---|---:|---|---|
| `VITE_API_BASE_URL` | Yes | Base URL for the application backend, such as `http://localhost:3001/api/v1` | Public |
| `VITE_SUPABASE_URL` | If browser Supabase client is used | Supabase project URL | Public |
| `VITE_SUPABASE_ANON_KEY` | If browser Supabase client is used | Supabase publishable/anon key used with RLS | Public, protected by RLS and policy design |
| `VITE_APP_ENV` | Optional | UI environment label, such as `development` | Public |

Example only:

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
VITE_APP_ENV=development
```

Use the current Supabase publishable/anon key format supported by the project. A public browser key is not a substitute for RLS. Do not expose a Supabase `service_role` key in any frontend variable.

## 7. Backend Variables

Create `server/.env.example` (or the equivalent in the actual backend directory). The table below is a suggested baseline; mark a variable required only if its feature is enabled in the selected deployment.

| Variable | Required | Purpose / notes |
|---|---:|---|
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes for server | HTTP port; use the hosting platform's assigned port when provided |
| `CLIENT_ORIGIN` | Yes | Explicit allowed frontend origin(s) for CORS; do not use unrestricted wildcard origins with credentials |
| `API_PREFIX` | Optional | API prefix, suggested `/api/v1` |
| `SUPABASE_URL` | Yes | Supabase project URL used by server SDK/client |
| `SUPABASE_ANON_KEY` | If server uses anon access | Public anon/publishable key; never grants administrative access by itself |
| `SUPABASE_SERVICE_ROLE_KEY` | Only for trusted server operations | Highly privileged secret; server-side only, minimal use, never return to clients |
| `DATABASE_URL` | If direct PostgreSQL connection is used | PostgreSQL connection string; protect and rotate credentials; use TLS where supported |
| `AI_PROVIDER` | If AI features enabled | Provider identifier selected by the implementation |
| `AI_PROVIDER_API_KEY` | If AI features enabled | Private key for the selected AI provider |
| `AI_MODEL` | If AI features enabled | Approved model identifier; validate availability in the chosen provider account |
| `AI_REQUEST_TIMEOUT_MS` | Optional | Maximum time allowed for an AI request |
| `AI_MAX_RETRIES` | Optional | Bounded retry count; do not retry non-retryable errors indefinitely |
| `STORAGE_BUCKET` | If file uploads enabled | Private bucket name for syllabus and user documents |
| `JUDGE0_BASE_URL` | If code execution enabled | Base URL of the isolated code-execution service |
| `JUDGE0_API_KEY` | If required by execution provider | Server-only credential for the execution service |
| `EXECUTION_TIMEOUT_SECONDS` | If code execution enabled | Server-enforced maximum execution time within provider limits |
| `EXECUTION_MEMORY_LIMIT_MB` | If supported by provider | Server-enforced memory ceiling |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | Optional | Request ceiling per window; define tighter limits for costly endpoints |
| `LOG_LEVEL` | Optional | For example `debug`, `info`, `warn`, or `error`; use `info` or stricter in production |
| `SENTRY_DSN` | If error monitoring enabled | Server-side error reporting endpoint; treat as configuration and review data sent to the provider |

Example placeholders (do not use these values as real credentials):

```dotenv
NODE_ENV=development
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
API_PREFIX=/api/v1

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
# Only set this in a trusted backend environment when required.
SUPABASE_SERVICE_ROLE_KEY=replace-with-server-only-secret
# Use only if the backend connects directly to PostgreSQL.
DATABASE_URL=postgresql://user:password@localhost:5432/adaptive_learning

AI_PROVIDER=your-provider
AI_PROVIDER_API_KEY=replace-with-secret
AI_MODEL=your-approved-model
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_RETRIES=2

STORAGE_BUCKET=private-learning-documents
JUDGE0_BASE_URL=https://your-judge0-host.example
JUDGE0_API_KEY=replace-if-required
EXECUTION_TIMEOUT_SECONDS=5
EXECUTION_MEMORY_LIMIT_MB=128

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=debug
```

Remove variables for integrations that are not configured. Do not paste real secrets into this document or commit real values in any `.env.example` file.

## 8. Supabase and PostgreSQL Configuration

1. Create separate Supabase projects for development/staging and production when feasible.
2. Store schema changes as ordered, reviewed SQL migrations in version control.
3. Apply migrations to a development database first and verify them before production deployment.
4. Enable RLS on all tables exposed through the Supabase Data API. Write and test policies for each user role and ownership relationship.
5. Keep service-role credentials on trusted backend infrastructure only. Never use them to bypass authorization without an explicit server-side permission check.
6. Keep answer keys, hidden coding tests, private review notes, and other protected records unavailable to student-facing queries.
7. Use parameterized SQL for all user-controlled values. Do not build SQL statements by concatenating request input.
8. Configure database connection pooling appropriately for the chosen runtime and hosting model.
9. Back up production data and define recovery procedures before launch.
10. Use separate test fixtures and never run destructive test migrations against production.

For authentication, verify Supabase access tokens on the server using the supported SDK or trusted verification method. Do not trust a user ID, role, or email supplied only in a request body.

## 9. AI Provider Configuration

- Route AI calls through a server-side provider adapter; the browser must not call a secret-key API directly.
- Configure allowed models and limits centrally rather than accepting arbitrary model names from clients.
- Apply timeouts, bounded retries, request-size limits, concurrency limits, and cost controls.
- Validate model output against a schema before storing or displaying it.
- Treat uploaded documents and retrieved text as untrusted input. Do not let document content override system or application rules.
- Record model/provider metadata needed for debugging and reproducibility, but avoid storing secrets or unnecessary personal data.
- Keep AI-generated questions and learning content in a reviewable workflow. Do not publish unvalidated output automatically where trainer approval is required.
- Provide a safe fallback when a provider is unavailable; do not fabricate successful generation results.

Suggested optional variables if the implementation needs them:

```dotenv
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_MAX_OUTPUT_TOKENS=4000
AI_DAILY_BUDGET_USD=10
```

These are application-level examples, not universal provider settings. Validate units and supported limits before implementation.

## 10. File Upload and Storage Configuration

- Use private storage buckets for student uploads and source documents by default.
- Generate short-lived signed URLs only after an authorization check.
- Enforce file size, MIME type, extension, and content validation on the server; do not trust browser-supplied content types.
- Use random object names rather than user-provided paths.
- Prevent path traversal and avoid exposing internal storage paths.
- Define retention and deletion rules for uploaded syllabi, resumes, code files, and derived content.
- Scan files where appropriate and reject unsupported or suspicious formats.

Any upload-size and allowed-file-type settings should be centrally configured and enforced by the backend, not only by the UI.

## 11. Code Execution Configuration

Student-submitted code is untrusted and must be executed only by a dedicated sandbox service such as Judge0 or an equivalent isolated platform.

- Do not execute user code through Node.js `child_process`, `eval`, or a shell in the web-server process.
- Enforce language allowlists, execution timeouts, memory ceilings, output limits, process limits, and request quotas.
- Keep hidden test cases and expected outputs on the server side; return only the permitted result details.
- Do not pass production credentials, database access, or internal network access to the execution sandbox.
- Apply network isolation and provider-level sandbox controls.
- Treat execution output as untrusted text and escape it before rendering.
- Record execution status and resource usage without logging secrets or unnecessarily retaining full source code.
- If the execution provider is unavailable, return a clear retryable error and preserve submission state safely.

## 12. CORS, Cookies, and Authentication

- Maintain an explicit allowlist of frontend origins in `CLIENT_ORIGIN` or the equivalent configuration.
- If multiple origins are required, parse and validate a documented list; do not blindly reflect the incoming `Origin` header.
- Enable credentialed CORS only when the authentication design requires it and with explicit origins.
- Prefer the authentication mechanism selected in `ARCHITECTURE.md`; document token storage and refresh behavior consistently.
- Use secure, HTTP-only, same-site cookies if cookie-based sessions are adopted, with CSRF protections where applicable.
- Apply server-side authorization checks to every protected route, even if the frontend hides controls.
- Set appropriate production security headers and HTTPS-only deployment settings.

## 13. Startup Validation

At application startup, validate:

- required variables are present and non-empty;
- URLs are valid and use HTTPS in production;
- ports, timeouts, retry counts, and size limits are valid numbers within configured bounds;
- `NODE_ENV` is one of the supported values;
- CORS origins are explicit and valid;
- feature-specific credentials exist when a feature is enabled;
- secrets are not being loaded into frontend build configuration;
- production mode does not enable verbose debug output.

If validation fails, stop startup and print the variable name and corrective guidance—never the secret value. Prefer a typed schema validation library already used by the repository; avoid adding a new dependency without need.

## 14. Deployment Checklist

### Before deployment

- [ ] Confirm all required variables are configured in the hosting platform.
- [ ] Confirm frontend variables contain public values only.
- [ ] Confirm production uses production Supabase and provider resources.
- [ ] Apply reviewed database migrations using the approved release process.
- [ ] Verify RLS policies and protected answer-key/test-case access.
- [ ] Verify CORS origins, authentication, authorization, rate limits, and security headers.
- [ ] Verify AI timeouts, token/cost limits, and bounded retries.
- [ ] Verify code execution is sandboxed and resource-limited.
- [ ] Confirm logs redact credentials, tokens, uploaded sensitive content, and private student data.
- [ ] Verify health checks, error monitoring, backups, and rollback instructions.

### After deployment

- [ ] Check backend health and database connectivity.
- [ ] Run a minimal authenticated smoke test for each role.
- [ ] Confirm a student cannot access another student's records.
- [ ] Confirm students cannot retrieve answer keys or hidden test cases.
- [ ] Confirm an AI or execution-provider outage returns a safe error.
- [ ] Inspect logs and monitoring for startup errors or unexpected request spikes.

## 15. Secret Rotation and Incident Response

If a secret is exposed:

1. Revoke or rotate it immediately in the provider dashboard.
2. Update the secret in every affected environment and deployment.
3. Redeploy or restart services as required.
4. Review access logs and usage for suspicious activity.
5. Remove the secret from tracked files and repository history where appropriate; deleting the latest line alone does not invalidate a leaked secret.
6. Document the incident and improve validation or secret handling to prevent recurrence.

Do not paste credentials into issue trackers, chat prompts, screenshots, commit messages, or application logs.

## 16. Troubleshooting

| Symptom | Likely checks |
|---|---|
| Frontend cannot reach backend | Check `VITE_API_BASE_URL`, backend port, API prefix, CORS allowlist, and whether the backend is running |
| Supabase authentication fails | Check project URL, public key, redirect URLs, token expiry, and configured auth providers |
| Database access denied | Check RLS policies, server-side role, ownership checks, migration state, and whether the correct environment is selected |
| Backend fails at startup | Check missing variables and validation output; never print secrets while debugging |
| AI requests time out | Check provider status, model access, request size, timeout, quotas, and retry bounds |
| File upload fails | Check private bucket name, authorization, storage policies, file limits, and signed URL expiry |
| Code execution fails | Check execution service URL, provider credentials, supported language, resource limits, and provider availability |
| Works locally but not in deployment | Compare variable names and environment scopes; verify preview/production settings and rebuild frontend assets after changing `VITE_` variables |

## 17. Change Management

Whenever a feature introduces a new environment variable:

1. Add it to the correct example file with a safe placeholder.
2. Document purpose, requiredness, owner, and exposure classification here.
3. Add startup validation and a clear failure message.
4. Configure local, test, preview, and production values as applicable.
5. Add tests for missing, malformed, and invalid combinations.
6. Review whether the variable could expose a secret to frontend bundles or logs.
7. Update `AGENT.md` or `ARCHITECTURE.md` if the variable reflects a meaningful change to development rules or system design.

## 18. Related Project Documents

- `PRD.md` — product requirements and scope.
- `AGENT.md` — coding-agent and developer rules.
- `ARCHITECTURE.md` — system components and integration boundaries.
- `DATABASE.md` — schema, RLS, data ownership, and migration guidance.
- `API_SPEC.md` — endpoint contracts and request/response conventions.

---

**Maintenance rule:** Update this document whenever the runtime, deployment topology, authentication approach, database access pattern, AI provider, storage provider, or code-execution service changes.
