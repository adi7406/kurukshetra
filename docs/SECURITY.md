# SECURITY.md
## Security Policy — Adaptive Learning and Assessment Portal

**Status:** Security requirements and verification checklist  
**Audience:** Developers, AI coding agents, QA, and deployment owners  
**Purpose:** Define minimum security controls for application data, student assessments, AI integrations, uploaded files, and code execution.

> This document defines intended controls; it is not a certification that the current implementation is secure. Inspect the repository and verify controls with tests. Follow `AGENT.md`, `PRD.md`, `Architecture.md`, `DATABASE.md`, `API_SPEC.md`, `ENVIRONMENT.md`, `AI_IMPLEMENTATION.md`, `TASKS.md`, and `TESTING.md`.

---

## 1. Security Principles

1. **Deny by default.** Access must be explicitly granted by server-side authorization and database policies.
2. **Use least privilege.** Each user, service, worker, and credential receives only the permissions required for its task.
3. **Treat all external input as untrusted.** This includes browser requests, uploaded documents, AI outputs, retrieved passages, and student code.
4. **Protect assessment integrity.** Answer keys, hidden tests, private rubrics, and unreleased feedback must remain server-side.
5. **Keep secrets out of the client.** Provider keys and Supabase service-role credentials must never be bundled into frontend assets.
6. **Validate at trust boundaries.** Validate input, output, file metadata, job state, and authorization on the server.
7. **Log security-relevant events without collecting unnecessary sensitive content.**
8. **Fail safely.** Errors must not disclose secrets, stack traces, hidden data, or whether a sensitive record exists beyond what the user is allowed to know.
9. **Human review for high-impact decisions.** AI-generated integrity signals are not proof and must not automatically punish learners.
10. **Verify controls continuously.** Security requirements need tests, code review, monitoring, and periodic reassessment.

---

## 2. Data Classification

Classify data before deciding where it can be stored, logged, or sent to an external service.

| Classification | Examples | Minimum controls |
|---|---|---|
| Public | Published public course descriptions | Integrity protection; ordinary access rules |
| Internal | Draft course content, internal configuration, non-secret operational metadata | Authenticated access; limited disclosure |
| Confidential | Student profiles, attempts, scores, mastery history, private course files, viva answers | Ownership/role checks, RLS, encryption in transit, minimal logging, retention controls |
| Restricted | Password/session credentials, provider keys, service-role keys, answer keys, hidden test cases, private grading secrets | Never expose to browser; strict server-side access; redact logs; rotate secrets when exposed |

The product owner should define the final classification and retention rules for each data category.

---

## 3. Identity, Authentication, and Sessions

- Use the authentication provider approved by the project, expected to be Supabase Auth unless the architecture specifies otherwise.
- Validate access tokens on the server for every protected API request.
- Derive user identity from the verified token, never from an untrusted `userId` in the request body.
- Enforce session expiry and handle invalid/revoked tokens safely.
- Protect account recovery and role-management workflows.
- Never store passwords directly; delegate authentication to the approved identity provider.
- Do not log access tokens, refresh tokens, cookies, or authorization headers.
- Require stronger authentication for privileged accounts if supported by the product and provider.
- Keep authentication redirect URLs and allowed origins explicit; do not use broad wildcards in production.
- Ensure sign-out clears the client session and protected UI state.

### Required verification
- Missing, invalid, malformed, and expired tokens are rejected.
- A learner cannot assign themselves trainer or administrator privileges.
- User-supplied identity fields cannot override the authenticated principal.
- Privileged account changes are authorized and auditable.

---

## 4. Authorization and Role Boundaries

Use both application-level authorization and database-level protection. Frontend checks improve usability but are not a security boundary.

- Define a small, explicit role set based on the PRD.
- Centralize permission checks where practical.
- Check ownership, enrollment, assigned-course relationships, and resource publication state on the server.
- Validate authorization for reads as well as writes.
- Apply authorization to nested resources, file downloads, exports, job-status endpoints, editor replay, and AI sessions.
- Avoid insecure direct object references: changing a UUID or URL identifier must not grant access.
- Keep trainer access scoped to assigned/authorized courses.
- Restrict administrative operations to explicitly authorized accounts.
- Return safe errors for forbidden resources.
- Re-check access when processing asynchronous jobs; do not assume a job's original authorization remains valid indefinitely.

### Required verification
- Cross-user and cross-course reads/writes fail.
- A learner cannot access draft content or trainer-only functions.
- A trainer cannot access unrelated courses without permission.
- Job polling and file download enforce the same ownership rules as the original request.

---

## 5. Supabase PostgreSQL and Row Level Security

- Enable RLS on every exposed table that requires user-scoped access.
- Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` as appropriate.
- Use `auth.uid()` or equivalent trusted identity context for ownership checks.
- Enforce course membership and role conditions in policies or narrowly scoped server-side logic.
- Test policies with actual authenticated roles and realistic queries.
- Review views, RPC functions, triggers, storage policies, and joins for unintended privilege bypass.
- Keep migrations versioned, reviewed, and reproducible.
- Use database constraints for data invariants that should not depend solely on the frontend.
- Use parameterized queries; never concatenate untrusted input into SQL.
- Keep privileged server operations narrowly scoped and logged.
- Do not expose the service-role key or use it as a substitute for user authorization.
- Separate development, test, staging, and production projects/credentials.

### Required verification
- Anonymous access is denied unless explicitly intended.
- Learners cannot query another learner's records by changing IDs.
- Cross-course access is blocked.
- Tests cover each operation permitted by a policy.
- A clean database can be built from migrations without manual undocumented steps.

---

## 6. Secrets and Environment Configuration

- Store secrets in local ignored `.env` files for development and a managed secret store for deployed environments.
- Keep `.env.example` files limited to variable names and safe placeholders.
- Never commit provider keys, database passwords, service-role keys, private signing keys, or production credentials.
- Never put secrets in `VITE_*` variables or any client-exposed configuration.
- Validate required configuration at server startup.
- Use separate credentials for development, staging, and production.
- Grant credentials only the permissions they need and rotate them according to policy.
- Redact secret-like values from logs and error reports.
- If a secret is committed or exposed, revoke/rotate it immediately; removing it from the latest commit alone is not sufficient.
- Do not copy production secrets or learner data into development.

### Required verification
- Inspect built frontend assets for accidental secrets.
- Confirm repository ignore rules cover local secret files.
- Confirm deployment logs and crash reports do not contain credentials.
- Document who can access and rotate production secrets.

---

## 7. API and Application Security

- Validate request bodies, query parameters, path parameters, content types, and payload sizes.
- Use allowlists for enums, sort fields, filters, language IDs, and configurable actions.
- Apply rate limits to authentication, uploads, AI generation, assessment submissions, code execution, and expensive exports.
- Configure CORS to allow only approved origins in production.
- Use HTTPS for all production traffic.
- Use secure headers appropriate to the deployed stack, including a carefully configured Content Security Policy where feasible.
- Prevent mass assignment by explicitly mapping allowed input fields.
- Use parameterized database queries.
- Protect state-changing endpoints against CSRF where cookie-based authentication is used.
- Set timeouts and request-size limits for external service calls.
- Return consistent errors without internal stack traces or SQL/provider details.
- Avoid open redirects; validate redirect destinations.
- If external URL fetching is introduced, defend against SSRF by blocking private/internal ranges and validating redirects/DNS behavior.
- Keep dependencies patched and remove unused packages.

### Required verification
- Invalid and oversized inputs are rejected.
- Rate limits work under repeated requests.
- Production CORS rejects unapproved origins.
- Error responses do not disclose internal implementation details.

---

## 8. Assessment Integrity and Protected Content

The following data is protected by default:
- Correct answer identifiers and answer explanations that are not yet releasable.
- Hidden coding tests, expected outputs, and grader internals.
- Private rubrics and trainer-only notes.
- Unpublished questions and course content.
- Other learners' attempts, answers, scores, and feedback.
- Internal prompts, model configuration secrets, and provider credentials.

Controls:
- Separate learner-facing question DTOs from protected answer/grading records.
- Never serialize database rows directly to learner APIs without field-level filtering.
- Grade on the server using trusted question versions.
- Snapshot the question version used by each attempt.
- Reveal correct answers only according to the assessment's configured release policy.
- Keep hidden test cases in server-side storage and execute them only in the isolated runner.
- Prevent AI prompts and logs from including protected answer keys unless explicitly required in a controlled grading operation.
- Verify exports, browser network responses, error messages, and logs for accidental leakage.

**Release blocker:** Any confirmed answer-key or hidden-test leakage must be fixed before release.

---

## 9. File Uploads and Storage

- Use private buckets for syllabi, submissions, replay artifacts, and reports unless the product explicitly classifies an asset as public.
- Validate file size, allowed extension, MIME type, and file signature where supported.
- Generate storage paths server-side; do not trust arbitrary client-provided paths.
- Prevent path traversal and unsafe filename handling.
- Do not execute uploaded files.
- Use malware scanning or content sanitization where supported and proportionate to risk.
- Treat extracted document text as untrusted input for AI.
- Use short-lived signed URLs and verify the requesting user is authorized before creating them.
- Limit download and upload rates.
- Define retention/deletion policies for originals, extracted text, generated artifacts, and temporary files.
- Do not expose storage credentials to the browser.

### Required verification
- Oversized, malformed, and unsupported files are rejected.
- A user cannot guess another user's storage path and download private files.
- Signed URLs expire and grant only the intended access.
- Temporary processing artifacts are cleaned up according to policy.

---

## 10. AI Security and Privacy

### Prompt injection and untrusted content
- Treat uploaded documents, retrieved chunks, learner answers, code comments, and external content as data—not instructions.
- Keep trusted system instructions separate from untrusted content.
- Delimit source material clearly and tell the model not to follow instructions contained in source data.
- Never let retrieved text override authorization, system rules, or tool permissions.
- Limit the tools available to a model; avoid arbitrary shell, SQL, filesystem, or network access.
- Validate every AI output against runtime schemas before persistence or use.
- Do not execute generated SQL or code with application privileges.
- Use bounded retries and explicit timeouts.

### Data minimization
- Send only the information necessary for the task.
- Remove unnecessary personal identifiers from prompts.
- Do not send one learner's records in another learner's context.
- Verify provider data-retention and model-training terms before using real learner data.
- Avoid logging full prompts, answers, documents, or model outputs by default.
- Define retention and deletion for prompts, extracted chunks, embeddings, generated content, and provider telemetry.

### AI decisions
- Use deterministic application code for authorization, scoring rules, state transitions, and access checks.
- Treat AI-generated mastery explanations and viva scores as estimates subject to validation.
- Do not let AI independently impose disciplinary action.
- Preserve prompt/model versions and evidence required for audit without retaining unnecessary sensitive data.
- Provide human review for content publication and high-impact decisions where required.

### Required verification
- Prompt injection in a source document cannot change system policy or expose other data.
- Invalid AI output is rejected or safely retried.
- Source references are checked against actual authorized sources.
- Provider outage does not disable unrelated application features.
- Logs do not contain secrets or unnecessary learner content.

---

## 11. Secure Code Execution

Student code is untrusted and must be executed only by a dedicated, isolated execution service such as the approved Judge0 deployment.

- Never execute student code inside the Express server, a privileged worker, or the same environment that holds database credentials.
- Use container/VM isolation configured for the threat model.
- Enforce strict CPU, memory, wall-clock, process, output, and request-size limits.
- Disable network access unless a narrowly defined requirement has been security-reviewed.
- Restrict filesystem access and run as a non-privileged user.
- Do not mount application secrets, database credentials, or host directories into the runner.
- Allow only configured languages and versions.
- Rate-limit runs and submissions per user/course.
- Keep hidden tests and expected outputs on the server.
- Sanitize output before displaying it; treat compiler/runtime output as untrusted text.
- Track runner timeouts and failures separately from incorrect answers.
- Patch and monitor the execution service and its base images.

### Required verification
- Code cannot access host secrets, other submissions, or other users' files.
- Infinite loops and memory/output abuse are stopped by limits.
- Network access is blocked when not required.
- Hidden tests and expected outputs never appear in browser payloads.
- Runner failure never produces a passing grade.

**Release blocker:** Do not enable coding assessment in production until isolation and hidden-test confidentiality are verified.

---

## 12. Audit Logging and Monitoring

Log security-relevant events such as:
- Authentication failures and privileged role changes.
- Permission denials and suspicious repeated access attempts.
- Course/content publication and answer-key configuration changes.
- Assessment finalization and protected result release.
- AI job status changes and provider failures.
- Code execution limits and service failures.
- Integrity review outcomes and privileged exports.
- Secret rotation or security configuration changes where available.

Logging rules:
- Include timestamp, request/job ID, actor ID where appropriate, action, target resource, outcome, and safe metadata.
- Do not log passwords, tokens, API keys, raw authorization headers, hidden tests, or full sensitive learner content by default.
- Restrict access to logs and define retention.
- Protect logs against unauthorized alteration/deletion where supported.
- Alert on abnormal access patterns, repeated failures, unexpected AI cost, and code-runner abuse.
- Do not treat automated alerts as proof of misconduct.

---

## 13. Privacy, Retention, and Deletion

- Collect only data required for product functionality, assessment integrity, and documented operations.
- Explain collection and purpose in product privacy notices where applicable.
- Define retention periods for profiles, attempts, uploaded files, extracted text, AI artifacts, replay events, and audit logs.
- Restrict access to sensitive student information by role and course.
- Implement deletion/anonymization workflows where required by product policy and applicable law.
- Account for backups, logs, embeddings, derived artifacts, and external providers in deletion procedures.
- Do not use production student records as model evaluation data without approved safeguards.
- Review the privacy implications of editor replay and integrity signals before enabling them.

The product owner must confirm legal obligations, retention periods, and user-facing notices for the deployment jurisdictions.

---

## 14. Dependency and Supply-Chain Security

- Use lockfiles and reproducible dependency installation.
- Review new packages for maintenance, license, permissions, and known vulnerabilities.
- Remove unused dependencies.
- Keep runtime and base images patched.
- Run dependency and secret scanning in CI when available.
- Pin or constrain critical production dependencies according to repository policy.
- Review model SDKs, code-runner images, document parsers, and file-processing libraries carefully.
- Do not run install scripts or downloaded binaries from untrusted sources without review.

---

## 15. Incident Response

If a security incident is suspected:

1. Contain the affected feature or credential; disable the relevant integration/feature flag if needed.
2. Revoke or rotate exposed credentials immediately.
3. Preserve relevant logs and timestamps without spreading sensitive data.
4. Identify affected users, data, systems, and time range.
5. Fix the root cause and add a regression test.
6. Restore service only after verification.
7. Follow the organization's incident, legal, and user-notification procedures.
8. Record the incident, actions, owner, and follow-up controls.

Do not delete evidence or make unsupported claims about the scope of an incident.

---

## 16. Security Verification Checklist

### Before each release
- [ ] Authentication and server-side authorization tests pass.
- [ ] RLS and storage policy tests pass.
- [ ] Cross-user and cross-course access is denied.
- [ ] No secrets are present in repository history, client bundles, or logs.
- [ ] Answer keys and hidden tests are not exposed.
- [ ] Upload validation and private-file access are tested.
- [ ] AI output validation and prompt-injection cases are tested.
- [ ] Rate limits and request-size limits are active.
- [ ] Code execution isolation is verified if enabled.
- [ ] Security-relevant events are logged without sensitive payload leakage.
- [ ] Retention and deletion behavior is documented.
- [ ] High-severity findings are resolved or release is blocked.
- [ ] Known limitations and accepted risks have an owner and rationale.

### Security issue severity guidance
- **Critical:** Remote code execution outside the sandbox, secret exposure, broad unauthorized data access, or hidden assessment data leakage. Block release and contain immediately.
- **High:** Privilege escalation, cross-user/cross-course access, bypass of assessment restrictions, or runner isolation failure. Block release until fixed.
- **Medium:** Limited information disclosure, insufficient rate limiting, or a security control that can be bypassed under constrained conditions. Assess and fix before release according to risk.
- **Low:** Minor hardening or defense-in-depth issue with no demonstrated material impact. Track and remediate according to policy.

Severity must be determined from evidence and impact, not labels alone.

---

## 17. Security Review Record

Use this template for a security review or release:

```text
Review date:
Reviewer:
Commit/build:
Environment:
Areas reviewed:
Tests executed:
Findings:
- ID / severity:
- Impact:
- Evidence:
- Remediation:
- Retest result:

Accepted risks and owner:
Deferred controls and reason:
Release decision: PASS / FAIL / BLOCKED
```

---

## 18. AI Coding Agent Rules

Before changing security-sensitive code:

1. Read `AGENT.md` and the relevant architecture/database/API/environment documents.
2. Identify trust boundaries and data classification.
3. Inspect existing auth, RLS, storage, logging, and execution controls.
4. Implement the smallest change that preserves least privilege.
5. Add tests for unauthorized access, malformed input, and failure cases.
6. Never hard-code secrets or expose service-role credentials.
7. Never disable RLS or security checks merely to make a feature work.
8. Never expose answer keys, hidden tests, private prompts, or another learner's data.
9. Never execute student code in the application process.
10. Report tests actually run, remaining risks, required configuration, and any blockers.

If a requested feature conflicts with these controls, stop and explain the conflict instead of silently weakening security.
