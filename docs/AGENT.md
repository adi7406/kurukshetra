# AGENT.md — Adaptive Learning and Assessment Portal

> **Purpose:** This file defines the operating rules for AI coding agents and human developers working in this repository. Follow it before planning, editing, generating, testing, or deploying code.

## 1. Project Mission

Build a secure, reliable, and maintainable adaptive learning and assessment platform. The portal helps learners study syllabus-aligned concepts, practise questions and coding tasks, receive evidence-based recommendations, and track mastery. Trainers control syllabus and content quality; administrators manage platform operations.

Core capabilities include:
- Syllabus creation from manual input, AI generation, or PDF/DOCX upload with extraction/OCR.
- Concept maps with prerequisite relationships and cycle validation.
- Trainer-reviewed theory, learning resources, questions, assessments, and test series.
- Per-learner mastery estimation and explainable, rule-based next-step recommendations.
- Secure coding assessments, isolated code execution, submissions, and replayable editor activity.
- Evidence-linked integrity signals, human review, and code-specific AI viva.
- Learner, trainer, and administrator dashboards, reports, and audit trails.

Optional extensions—such as DevOps labs or GitHub repository evaluation—must not displace core requirements unless explicitly prioritised by the user.

## 2. Documentation Is the Contract

Before making changes, inspect the repository and read the relevant documentation in this order:

1. `AGENT.md` — working rules and safety constraints.
2. `PRD.md` — product scope, requirements, user journeys, and acceptance criteria.
3. `TECHNICAL_ARCHITECTURE.md` — system boundaries, components, and code organisation, if present.
4. `DATABASE.md` — authoritative database schema, relationships, constraints, RLS, and migration rules.
5. `API_SPECIFICATION.md` — API routes, request/response contracts, errors, and authentication rules, if present.
6. Relevant frontend, AI, testing, deployment, and environment documents, if present.

If a referenced file does not exist, do not pretend it does. Inspect the repository, proceed only where requirements are clear, and report the missing document if it blocks safe implementation.

### Source of truth and conflicts
- `PRD.md` is authoritative for product behaviour and scope.
- `TECHNICAL_ARCHITECTURE.md` is authoritative for system structure and component boundaries.
- `DATABASE.md` is authoritative for database design and data-access security.
- `API_SPECIFICATION.md` is authoritative for external API contracts.
- `AGENT.md` governs the development workflow and safety rules.
- If documents conflict, do not silently choose a behaviour. Identify the conflict and ask for clarification when it affects security, data integrity, scope, or public contracts. For minor implementation details, choose the least surprising compatible option and document the decision.
- Update relevant documentation whenever an approved implementation changes behaviour, schema, endpoints, configuration, or setup instructions.

## 3. Expected Technology Stack

Use the existing repository configuration as the final authority; do not replace tools simply because another option is familiar.

- **Frontend:** React, Vite, TypeScript where configured, Tailwind CSS, Monaco Editor for coding tasks, and Recharts for analytics.
- **Backend:** Node.js, Express, TypeScript, and REST APIs.
- **Data and identity:** Supabase PostgreSQL, Supabase Auth, and Supabase Storage with Row Level Security (RLS).
- **AI:** Provider-configurable LLM integration, structured outputs, validation, and retrieval-augmented generation (RAG) where required.
- **Code execution:** Judge0 or an equivalently isolated execution service. Never execute learner code inside the main Express process.
- **Deployment:** Vercel for the frontend where configured; use the repository's documented backend and worker deployment target.

Do not introduce a new framework, database, state-management library, ORM, AI provider, or execution service without a clear need and approval where the change is architectural.

## 4. Required Workflow for Every Task

### Step 1 — Understand
- Read the relevant documentation and inspect the existing implementation before editing.
- Identify the affected user journey, files, API contracts, database tables, permissions, and tests.
- Check the current branch and working tree. Preserve unrelated user changes; never overwrite work just to make the tree clean.
- For database work, inspect existing migrations and live schema state through the approved tools before proposing changes.

### Step 2 — Plan
- Break the task into small, verifiable steps.
- State important assumptions and identify security, privacy, migration, and compatibility risks.
- Prefer the smallest complete change that satisfies the requirement.
- If the request is ambiguous in a way that could cause destructive changes, expose data, or change product behaviour, ask before proceeding.

### Step 3 — Implement
- Follow existing naming, folder, typing, formatting, error-handling, and architectural conventions.
- Keep changes focused. Avoid unrelated refactors and unnecessary dependencies.
- Use reusable modules and clear separation between UI, business logic, persistence, and external services.
- Validate untrusted input at system boundaries and return consistent, safe errors.
- Keep business rules server-side; never rely on frontend checks for authorisation or assessment security.

### Step 4 — Verify
- Run the most relevant available tests, type checks, linting, builds, migration checks, and security checks.
- Add or update tests for changed behaviour and edge cases.
- If a check cannot run, state why. Never claim a test, build, migration, or deployment succeeded unless it actually ran successfully.

### Step 5 — Report
Finish with a concise summary containing:
1. What changed and why.
2. Files created or modified.
3. Tests/checks run and their actual outcomes.
4. Database migrations, RLS, or environment changes required.
5. Known limitations, assumptions, and recommended next steps.

## 5. Code Quality Standards

- Prefer clear, readable, strongly typed code over clever shortcuts.
- Avoid `any` unless there is a documented reason; use validation and appropriate types for external data.
- Do not duplicate business rules across frontend and backend.
- Keep controllers/route handlers thin; place reusable business logic in service modules.
- Use parameterised SQL or safe query-builder methods. Never concatenate untrusted input into SQL.
- Handle loading, empty, success, and error states in the UI.
- Use accessible labels, keyboard navigation, semantic HTML, and responsive layouts.
- Avoid hard-coded secrets, tokens, user IDs, URLs, and environment-specific values.
- Do not add mock data to production paths. Clearly isolate demo fixtures and test data.
- Preserve backward compatibility for existing APIs unless a breaking change is explicitly approved and documented.

## 6. Database and Supabase Rules

`DATABASE.md` defines the intended schema. Read it before creating or changing tables, columns, constraints, indexes, functions, triggers, policies, or seed data.

- Use versioned, ordered SQL migrations. Inspect existing migration history first and add a new migration rather than rewriting an applied migration.
- Never reset, drop, truncate, or recreate a database/schema/table, or delete user data, without explicit approval and a verified recovery plan.
- Do not apply migrations to production automatically. Confirm the target environment and review destructive or data-transforming operations first.
- Add appropriate primary keys, foreign keys, unique constraints, checks, indexes, and timestamps according to `DATABASE.md`.
- Preserve version history for published learning content and questions; do not silently mutate published versions that existing attempts reference.
- Validate prerequisite graphs to prevent cycles.
- Keep mastery history and audit/evidence records append-only where specified; use explicit correction events rather than silently rewriting historical evidence.
- Use transactions for multi-step writes that must remain consistent.
- Use migrations and documented seed files; seed data must be safe, deterministic, and free of real personal data or credentials.
- Enable and test RLS on exposed tables. A table is not secure merely because the frontend hides its records.
- Enforce ownership and role checks in database policies and/or trusted server-side logic. Prevent users from granting themselves trainer or administrator privileges.
- Never expose service-role credentials to the browser. Use only the public/anon key in frontend code, with correct RLS policies.
- Protect answer keys, grading rubrics where confidential, hidden coding test cases, private assessment configuration, and unreleased content from unauthorised learners.
- Verify policies for learner, trainer, administrator, and unauthenticated access, including cross-user access attempts.

## 7. Security, Privacy, and Assessment Integrity

- Treat all browser input, uploaded documents, AI output, code submissions, and external API responses as untrusted.
- Keep secrets in environment variables or the approved secret manager. Never commit `.env` files, tokens, private keys, or production data.
- Validate file type, size, and content; store uploads in appropriately protected buckets and enforce access rules.
- Apply authentication, authorisation, input validation, rate limits, and safe logging to sensitive endpoints.
- Never return stack traces, secrets, hidden tests, internal prompts, or sensitive database details to clients.
- Do not log passwords, access tokens, full private documents, or unnecessary personal data.
- Apply least privilege to service roles and external provider credentials.
- Execute untrusted code only in a hardened isolated environment with CPU, memory, runtime, filesystem, process, and network restrictions. Do not permit arbitrary host access or unrestricted outbound networking.
- Do not trust client-supplied scores, execution results, timestamps, or role claims. Verify results server-side and use trusted service responses.
- Store only telemetry necessary for the documented learning or integrity purpose, with clear access and retention rules.
- Integrity signals are indicators for review, not proof of misconduct. Preserve supporting evidence, provide human review, and never automatically punish a learner based solely on an AI or telemetry score.
- Keep AI-generated content clearly marked as draft until required validation and trainer approval are complete.

## 8. AI and Adaptive Learning Rules

- Treat LLM output as untrusted data. Validate it against explicit schemas and domain rules before storing or showing it.
- Use structured outputs where practical, with retries or safe failure handling for malformed responses.
- Do not let generated content bypass trainer review or publication states defined in the PRD.
- Ground generated explanations and questions in the approved syllabus/resources when required; preserve source references where the product requires evidence.
- Prevent prompt injection from uploaded files and retrieved content from overriding system or application rules.
- Keep provider credentials on the server. Use configurable providers and model settings rather than scattering provider-specific calls through the codebase.
- Do not fabricate citations, source evidence, learning outcomes, test results, or confidence values.
- Keep mastery estimates separate from raw attempt evidence. Record model/configuration details where specified so results can be explained and reproduced.
- Make recommendations traceable to mastery, prerequisites, learner goals, or explicit rules. Provide a sensible fallback when data is insufficient.
- Do not label a learner as mastered or deficient based on a single weak signal unless the documented model explicitly requires it.
- AI viva questions should relate to the learner's submitted code and permitted evidence; store answers and evaluation according to the privacy and review requirements.

## 9. API and Frontend Rules

- Follow `API_SPECIFICATION.md` when present. Keep request, response, status-code, and error formats consistent.
- Validate request bodies, path parameters, query parameters, and uploaded files on the server.
- Authenticate protected routes and authorise every resource access; never rely only on a route being hard to guess.
- Avoid exposing internal database structure directly when a stable API contract is required.
- Use environment variables for API base URLs and provider configuration. Document new variables in `.env.example` without real values.
- Never place privileged Supabase keys or AI-provider keys in Vite-exposed variables (such as `VITE_*`).
- Keep frontend components focused; isolate API access and reusable UI/business logic in appropriate modules.
- Prevent duplicate submissions and handle timeouts, retries, expired sessions, and partial failures thoughtfully.
- For coding assessments, ensure the client cannot access hidden tests, correct answers, private grading configuration, or privileged execution-service credentials.

## 10. Testing Requirements

Choose tests appropriate to the change and the available project setup:

- **Unit tests:** business rules, validation, mastery updates, recommendation logic, and utility functions.
- **Integration tests:** API endpoints, database transactions, RLS/permissions, storage access, and external-service adapters.
- **End-to-end tests:** key learner and trainer journeys, where tooling exists.
- **Security tests:** cross-user access, role escalation, hidden-answer exposure, malformed input, upload abuse, and execution isolation boundaries.
- **Migration checks:** clean application to a disposable/test database, constraints, indexes, RLS policies, and seed repeatability.
- **AI tests:** schema validity, malformed output handling, source grounding, and safe fallback behaviour; do not rely solely on subjective text comparisons.

Never use production personal data as test fixtures. Mock external services in unit tests; use controlled integration environments for real provider/database checks.

## 11. Git and Change Management

- Respect the repository's established branch and pull-request process.
- Do not force-push, rewrite shared history, delete branches, or merge/publish changes unless explicitly requested and authorised.
- Do not commit generated build output, secrets, local databases, logs, or large temporary files.
- Keep commits and pull requests focused and explain schema/API changes and any deployment steps.
- For potentially breaking changes, document the migration path and compatibility impact.
- Do not change dependency versions or lockfiles unnecessarily.

## 12. Environment and Deployment

- Inspect `.env.example`, package scripts, deployment settings, and existing setup docs before changing configuration.
- Never invent production credentials or assume an environment variable exists; report required variables explicitly.
- Update `.env.example` and setup documentation when adding or renaming configuration keys.
- Keep development, test, staging, and production resources distinct.
- Do not deploy, run production migrations, rotate credentials, or modify live resources without explicit authorisation.
- Verify build commands and deployment assumptions against the actual repository rather than relying on generic framework defaults.

## 13. When to Ask Before Acting

Pause and ask for confirmation before:
- Deleting or irreversibly changing data, schema, storage, or user accounts.
- Resetting a database or changing a production resource.
- Weakening authentication, RLS, validation, sandbox restrictions, or audit controls.
- Changing a public API contract, core architecture, or major dependency without a clear approved requirement.
- Publishing AI-generated learning content or assessment material when trainer approval is required.
- Making consequential integrity decisions or automating learner penalties.
- Performing deployment, merging, force-pushing, or other consequential external actions not explicitly requested.

Do not ask for confirmation for routine, reversible, clearly specified code edits. Make reasonable low-risk decisions and document them.

## 14. Definition of Done

A task is complete only when applicable items below are satisfied:

- [ ] Requirements and relevant documentation were reviewed.
- [ ] The implementation meets the requested acceptance criteria.
- [ ] Code follows existing project conventions and includes appropriate validation/error handling.
- [ ] Permissions, RLS, and sensitive-data exposure were considered and tested where relevant.
- [ ] Tests/type checks/lint/build checks were run, with outcomes reported honestly.
- [ ] Database changes use safe versioned migrations and preserve required history.
- [ ] Relevant documentation and `.env.example` were updated.
- [ ] No secrets, real personal data, hidden answers, or unsafe execution paths were introduced.
- [ ] Remaining limitations and manual steps are clearly reported.

## 15. Final Response Format

Use a concise, factual report:

**Implemented**
- Brief description of the change.

**Files changed**
- List the important paths.

**Validation**
- Commands/checks run and actual results.

**Follow-up**
- Required migrations, environment variables, manual review, or known gaps.

Never claim completion for work that was not performed or verified.
