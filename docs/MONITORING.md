# Platform Monitoring, Cost Controls, and Incident Response

**Document Version:** 1.0.0  
**Associated Task:** `TASK-038`  
**Target Environment:** Production, Staging, Local Development

---

## 1. Overview and Architecture

The Adaptive Learning and Assessment Portal server includes native telemetry, deep readiness diagnostics, real-time latency statistics, error categorization, and AI cost controls.

### Core Endpoints

| Endpoint | Method | Role Required | Description |
|---|---|---|---|
| `/health` | `GET` | Public | Liveness probe: returns process uptime, version, timestamp, and memory RSS / heap statistics. |
| `/readiness` | `GET` | Public | Readiness probe: deep dependency inspection (PostgreSQL ping, runner availability, storage status). Returns 200 when ready, 503 when degraded. |
| `/api/v1/admin/metrics` | `GET` | Trainer / Admin | Returns traffic distribution (2xx, 4xx, 5xx), rolling latency stats (min, max, avg, p95), error categories, active alerts, and system health. |
| `/api/v1/admin/ai-usage` | `GET` | Trainer / Admin | Returns AI token consumption, total spend (USD), and recent operation logs. |
| `/api/v1/admin/ai-budget` | `POST` | Admin | Sets or adjusts max AI budget (USD) for a learner or tenant to prevent runaway cost. |

---

## 2. Telemetry and Metrics Collection

1. **Request Tracing & Latencies:**
   - Every inbound request receives an immutable `X-Request-ID` via `requestIdMiddleware`.
   - `metricsMiddleware` records status codes and calculates response duration in milliseconds.
   - P95, minimum, maximum, and average response times are calculated across a rolling window of recent requests.

2. **Error Categorization:**
   - Errors are categorized by machine-readable codes (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `INTERNAL_ERROR`).
   - Stack traces and internal database connection strings are never leaked to clients.

3. **Active Health Alerts:**
   - **Critical Alert (`high_server_error_rate`):** Triggered when 5xx status codes exceed 10% of total inbound requests.
   - **Critical Alert (`sustained_consecutive_failures`):** Triggered when 5 or more consecutive 5xx errors occur.
   - **Warning Alert (`elevated_job_failures`):** Triggered when asynchronous background job failures exceed 5 occurrences.

---

## 3. AI Usage and Cost Controls

To ensure predictable operational costs and prevent denial-of-wallet attacks:

1. **Model Token Accounting:**
   - Prompt and completion tokens are tracked per operation (e.g. `ai_viva`, `ai_rubric_evaluation`).
   - Costs are derived from standard production pricing tables (e.g. `gpt-4o`, `gpt-4o-mini`, `claude-3-5-sonnet`).

2. **Budget Enforcement:**
   - Each learner or course has a configurable maximum AI spend budget (default: $10.00 USD).
   - `monitoringService.checkBudget(userId)` verifies accumulated cost before initiating expensive AI viva generations.
   - If the budget is exhausted, the server throws `RateLimitError` (`429 Too Many Requests`) preventing further LLM calls until reviewed by an administrator.

---

## 4. Retention and Privacy Policy

- **Application Logs:** Retained for 30 days in centralized rotating log storage.
- **Audit Logs (`audit_logs`):** Retained for 90 days for compliance, security reviews, and human review appeals.
- **AI Telemetry (`aiUsageRecords`):** Aggregated token counts retained; sensitive candidate prompt texts are stripped and minimized.
- **Data Minimization:** No plaintext passwords, auth tokens, session secrets, or full candidate answers are stored in operational log files.

---

## 5. Backup and Disaster Recovery

1. **Automated Database Snapshots:**
   - Continuous WAL archiving with Point-In-Time Recovery (PITR) up to 7 days on Supabase PostgreSQL.
   - Daily automated backups retained for 30 days.

2. **Restoration Runbook:**
   - Target Recovery Point Objective (RPO): < 1 hour.
   - Target Recovery Time Objective (RTO): < 2 hours.
   - Rollback scripts and ordered migrations (`0001_initial_core.sql` through `0011_reports_and_audit.sql`) ensure full schema rebuildability.

---

## 6. Incident Response and Responsibilities

| Role | Responsibility | Escalation Target |
|---|---|---|
| Platform On-Call | Monitors `/readiness` and active alerts; acts on sustained 5xx outages. | Lead Backend Architect |
| Security Lead | Audits privileged exports, access failures, and unauthorized attempts. | Security Operations |
| Course Administrator | Reviews AI budget limit requests and human integrity review escalations. | Product Operations |
