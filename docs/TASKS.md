# TASKS.md
## Development Roadmap — Adaptive Learning and Assessment Portal

**Status:** Initial implementation backlog  
**Purpose:** Break the product requirements into small, verifiable tasks for developers and AI coding agents.

> Before implementation, inspect the repository and reconcile this backlog with `PRD.md`, `AGENT.md`, `Architecture.md`, `DATABASE.md`, `API_SPEC.md`, `ENVIRONMENT.md`, `AI_IMPLEMENTATION.md`, and `frontend_design.md`. Do not assume a feature is complete merely because a task is checked off.

## 1. Task Status and Rules

Use one status per task:
- `TODO` — not started
- `IN_PROGRESS` — actively being implemented
- `BLOCKED` — blocked; record the reason
- `DONE` — acceptance criteria verified
- `DEFERRED` — moved out of the current release, with a reason

Rules:
1. Read relevant documentation before changing code.
2. Inspect existing code and preserve working implementation.
3. Verify dependencies before starting a task.
4. Make small changes and run relevant tests.
5. Do not mark a task complete based only on generated code.
6. Use versioned database migrations.
7. Do not weaken authentication, RLS, answer-key protection, or code-execution isolation.
8. Do not invent endpoints, environment variables, providers, or database tables without documenting and implementing them.
9. Update task status and documentation when scope changes.
10. Record blockers instead of silently bypassing them.

**Definition of Done**
- [ ] Acceptance criteria are met.
- [ ] Relevant tests pass.
- [ ] Authorization and error cases are covered.
- [ ] Migrations/types are updated if needed.
- [ ] Documentation and environment examples are updated if needed.
- [ ] No secrets or protected assessment data are exposed.
- [ ] Behavior is verified against the project specifications.

## 2. Milestones

| Milestone | Goal | Depends on |
|---|---|---|
| M0 | Repository audit and specification reconciliation | None |
| M1 | Project foundation and developer workflows | M0 |
| M2 | Authentication, profiles, roles, and RLS | M1 |
| M3 | Courses, syllabus, concepts, prerequisite graph | M2 |
| M4 | Learning resources and question bank | M3 |
| M5 | Assessments, grading, and results | M4 |
| M6 | Mastery estimation and recommendations | M5 |
| M7 | Coding editor, isolated execution, event replay | M5 |
| M8 | AI viva and human-reviewed integrity workflow | M5; M7 where relevant |
| M9 | Learner/trainer dashboards and reporting | M5–M8 |
| M10 | Security, deployment, monitoring, acceptance | MVP tasks |

Adjust after auditing the repository. Prefer a thin end-to-end vertical slice over building every backend module before testing the UI.

## 3. M0 — Audit and Planning

### TASK-001 — Inspect the repository
**Status:** DONE · **Priority:** P0
- [x] Inspect `client/`, `server/`, and `ai/`.
- [x] Identify framework versions, package managers, scripts, entry points, routes, components, services, migrations, and existing integrations.
- [x] Classify features as implemented, partial, or missing.
- [x] Record blockers and specification/code conflicts.

**Acceptance:** Existing work is preserved; audit identifies the safest first vertical slice.

### TASK-002 — Reconcile specifications
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-001
- [x] Compare PRD, architecture, database, API, environment, AI, and UI design documents.
- [x] Resolve naming/status/role/request-response/security inconsistencies.
- [x] Identify MVP versus future scope.
- [x] Record decisions requiring project-owner input.

**Acceptance:** No unresolved conflict is silently encoded into implementation.

## 4. M1 — Foundation

### TASK-003 — Establish client/server workflows
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-001
- [x] Verify install, dev, build, lint, and test commands.
- [x] Configure JavaScript/Node.js conventions and existing lint/format conventions.
- [x] Document how to run client and server.

**Acceptance:** A developer can start the application using documented commands.

### TASK-004 — Environment configuration
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-003
- [x] Create/update `.env.example` files without real secrets.
- [x] Validate required server configuration at startup.
- [x] Separate public client variables from server-only secrets.
- [x] Ensure provider keys and Supabase service-role credentials never enter client bundles.
- [x] Follow `ENVIRONMENT.md`.

**Acceptance:** Missing production configuration fails clearly; no secrets are committed.

### TASK-005 — API validation and error handling
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-003
- [x] Implement response/error conventions from `API_SPEC.md`.
- [x] Add request validation and centralized error handling.
- [x] Add request/correlation IDs and safe logs.
- [x] Never expose stack traces or raw provider/database errors.

**Acceptance:** Success, validation, unauthorized, forbidden, not-found, and server-error responses follow the API contract.

### TASK-006 — Testing baseline
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-003
- [x] Configure unit/integration testing based on the existing stack.
- [x] Test health checks, shared validation, and error handling.
- [x] Add CI checks if CI is available.
- [x] Document test commands in `TESTING.md`.

**Acceptance:** Tests run reproducibly and failures are visible.

## 5. M2 — Identity and Access

### TASK-007 — Integrate Supabase Auth
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-004, TASK-005
- [x] Implement approved sign-in, sign-out, session restore, and protected routes.
- [x] Validate access tokens on the server.
- [x] Handle expired/invalid sessions.

**Acceptance:** Protected APIs reject missing, invalid, and expired tokens.

### TASK-008 — Profiles and roles
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-007
- [x] Synchronize authenticated users with the profile schema.
- [x] Implement approved roles and role-assignment rules.
- [x] Prevent self-assignment of trainer/admin privileges.
- [x] Validate profile read/update fields.

**Acceptance:** Users access only permitted profile fields; privileged role changes require authorization.

### TASK-009 — RLS and authorization tests
**Status:** DONE · **Priority:** P0 · **Depends on:** TASK-007, TASK-008
- [x] Add migrations and RLS policies for exposed tables.
- [x] Enforce ownership, enrollment, course, and role boundaries.
- [x] Test anonymous, learner, trainer, and admin access as applicable.
- [x] Audit privileged server operations.

**Acceptance:** Cross-user/course access fails safely; frontend filtering is never the sole authorization control.

## 6. M3 — Courses and Syllabus

### TASK-010 — Courses and enrollment
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-009
- [x] Implement course listing/detail and authorized course management.
- [x] Implement enrollment/membership checks.
- [x] Validate draft/published states.

**Acceptance:** Learners see only authorized courses; unauthorized mutations are rejected.

### TASK-011 — Syllabus upload and source tracking
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-010
- [x] Configure private storage and upload limits.
- [x] Validate file type, size, ownership, and permissions.
- [x] Store source metadata and processing status.
- [x] Extract text with approved parsers and preserve page/section metadata where possible.

**Acceptance:** Invalid files are rejected; source documents remain private; failures are visible and retryable.

### TASK-012 — Syllabus extraction and trainer approval
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-011, TASK-019
- [x] Run long extraction as an asynchronous job.
- [x] Validate modules, objectives, concepts, prerequisites, and source references.
- [x] Save extraction as a draft.
- [x] Support trainer review, correction, and approval.
- [x] Track prompt/model version where applicable.

**Acceptance:** Invalid output is not published; retries do not create duplicates.

### TASK-013 — Concept and prerequisite graph
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-010
- [x] Implement concept CRUD and course mapping.
- [x] Implement prerequisite links.
- [x] Reject self-links and cycles.
- [x] Expose authorized graph data to the frontend.

**Acceptance:** Invalid relationships are rejected and graph reads are properly scoped.

## 7. M4 — Learning Content and Questions

### TASK-014 — Learning resource management
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-013
- [x] Implement resource creation, editing, versioning, and publication.
- [x] Link resources to concepts and sources.
- [x] Enforce trainer permissions and learner publication rules.

**Acceptance:** Draft resources are hidden from learners and required version history is preserved.

### TASK-015 — Question bank and versions
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-013
- [x] Implement question types from the PRD.
- [x] Protect answer keys, rubrics, and hidden test data.
- [x] Map questions to concepts and difficulty.
- [x] Validate options, answers, explanations, and rubrics.
- [x] Preserve versions used by historical attempts.

**Acceptance:** Learner APIs never leak protected answers; historical attempts retain their original question versions.

### TASK-016 — AI content/question generation
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-014, TASK-015, TASK-019
- [ ] Use the shared provider adapter and versioned prompts.
- [ ] Validate all model output against runtime schemas.
- [ ] Ground content in authorized sources where applicable.
- [ ] Save generated items as drafts with source/model metadata.
- [ ] Add bounded retries, timeouts, usage tracking, and safe failure states.
- [ ] Require trainer review before publication where specified.

**Acceptance:** Invalid output is rejected; provider failure does not break unrelated features; generated content is not silently published.

### TASK-017 — Trainer authoring and review
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-015
- [x] Allow authorized trainers to create/edit/preview questions.
- [x] Validate answer keys and rubrics.
- [x] Implement review and publication workflow.
- [x] Add duplicate checks where feasible.

**Acceptance:** Trainers can author and publish questions; learners cannot access editing or answer-key routes.

## 8. M5 — Assessments and Grading

### TASK-018 — Assessments and test series
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-015, TASK-017
- [x] Implement assessment creation and question assignment.
- [x] Implement test-series organization and access rules.
- [x] Enforce timing, attempt limits, availability, and scoring rules.
- [x] Snapshot question versions for attempts.

**Acceptance:** Only published/authorized assessments can be started; historical attempts reference the correct versions.

### TASK-019 — Asynchronous job framework
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-005, TASK-006
- [x] Select a job mechanism compatible with hosting and architecture.
- [x] Define job states, idempotency, retries, timeouts, and cancellation.
- [x] Add authorized job-status retrieval.
- [x] Define abandoned-job cleanup and retention.
- [x] Reuse for syllabus and AI generation.

**Acceptance:** Long jobs do not block ordinary API requests; retries do not duplicate results.

### TASK-020 — Assessment attempt lifecycle
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-018
- [x] Implement start, resume if allowed, answer save, submit, and finalize.
- [x] Enforce ownership, timing, and attempt limits server-side.
- [x] Make submission/finalization idempotent.
- [x] Record required attempt evidence.
- [x] Handle interruptions without silently losing saved answers.

**Acceptance:** Learners cannot alter others' attempts; repeated submissions do not double-grade.

### TASK-021 — Grading and results
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-020
- [x] Grade objective questions server-side.
- [x] Apply versioned rubrics where required.
- [x] Separate learner-visible feedback from protected grading data.
- [x] Store results and per-concept evidence.
- [x] Implement authorized result views.

**Acceptance:** Scores use trusted server data; answer disclosure follows policy; grading is testable and repeatable.

## 9. M6 — Adaptive Learning

### TASK-022 — Mastery evidence pipeline
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-021, TASK-013
- [x] Map finalized answers to concepts.
- [x] Validate ownership and evidence status.
- [x] Make evidence processing idempotent.
- [x] Preserve append-only mastery history.

**Acceptance:** Reprocessing does not double-count evidence; updates are traceable.

### TASK-023 — Mastery estimator
**Status:** DONE · **Priority:** P1 · **Depends on:** TASK-022
- [x] Implement the approved deterministic/rule-based baseline.
- [x] Version model parameters.
- [x] Add boundary and repeated-evidence tests.
- [x] Add BKT according to approved product/model decisions.
- [x] Explain estimates and limitations in the UI.

**Acceptance:** Values remain in bounds and are reproducible for the same evidence/model version.

### TASK-024 — Personalized recommendations
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-023, TASK-014, TASK-018
- [ ] Filter to available, published, authorized activities.
- [ ] Enforce prerequisites.
- [ ] Rank by approved mastery-gap/readiness policy.
- [ ] Return concise reasons and evidence.
- [ ] Provide deterministic fallback if AI explanations fail.

**Acceptance:** Recommendations never bypass access/prerequisite rules; empty states remain useful.

## 10. M7 — Coding Assessments and Replay

### TASK-025 — Coding editor
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-018
- [ ] Integrate Monaco Editor or the editor approved by the PRD.
- [ ] Support configured languages only.
- [ ] Load starter code and constraints.
- [ ] Save drafts according to attempt rules.
- [ ] Show execution and error states clearly.

**Acceptance:** Editor state belongs to the correct attempt; hidden tests are never sent to the client.

### TASK-026 — Isolated code execution
**Status:** TODO · **Priority:** P0 before coding launch · **Depends on:** TASK-004, TASK-025
- [ ] Configure Judge0 or the explicitly approved equivalent.
- [ ] Execute only in an isolated runner, never in Express.
- [ ] Enforce language allowlists, CPU/time/memory and payload limits.
- [ ] Disable unnecessary network/privileged access.
- [ ] Keep hidden tests and expected outputs server-side.
- [ ] Rate-limit execution and protect against resource exhaustion.

**Acceptance:** Isolation and hidden-test confidentiality are security-tested before production.

### TASK-027 — Submissions and execution results
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-026
- [ ] Implement run-sample-tests and submit-for-grading flows.
- [ ] Associate results with the correct submission and attempt.
- [ ] Authorize job-status retrieval.
- [ ] Return only permitted output/test details.
- [ ] Prevent unbounded duplicate executions.

**Acceptance:** Users see only permitted results for their own submissions; hidden tests remain protected.

### TASK-028 — Editor event recording and replay
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-025, TASK-027
- [ ] Define versioned event types and schema.
- [ ] Record relevant actions/timestamps while minimizing collected data.
- [ ] Batch/throttle event uploads.
- [ ] Validate ownership, ordering, timestamps, and payload size.
- [ ] Build authorized replay timeline.
- [ ] Define retention rules.

**Acceptance:** Replay data is access-controlled and treated as context, not conclusive proof of misconduct.

## 11. M8 — AI Viva and Integrity Review

### TASK-029 — AI viva session lifecycle
**Status:** TODO · **Priority:** P2 · **Depends on:** TASK-018, TASK-019
- [ ] Implement start, question, answer, complete, and cancel states.
- [ ] Restrict questions to approved objectives/topics/difficulty.
- [ ] Track session events and prompt/model/rubric versions as needed.
- [ ] Enforce ownership, duration, and usage limits.

**Acceptance:** Sessions cannot access other learners' records or hidden assessment data; failures are recoverable.

### TASK-030 — Rubric-based viva feedback
**Status:** TODO · **Priority:** P2 · **Depends on:** TASK-029, TASK-016
- [ ] Define versioned rubric schemas.
- [ ] Validate criterion IDs, score bounds, and evidence.
- [ ] Label AI feedback/provisional scores.
- [ ] Add trainer review/correction where required.
- [ ] Test unsupported claims and inconsistent scoring.

**Acceptance:** Scores remain within rubric bounds; unreviewed AI output cannot trigger punitive action.

### TASK-031 — Integrity signals
**Status:** TODO · **Priority:** P2 · **Depends on:** TASK-028
- [ ] Define permitted signal types and meanings.
- [ ] Store evidence, timestamps, detector/version, and uncertainty.
- [ ] Restrict access and define retention.
- [ ] Never infer guilt from one signal or automatically penalize a learner.

**Acceptance:** Signals are review leads, not proof; access is limited to authorized reviewers.

### TASK-032 — Human review workflow
**Status:** TODO · **Priority:** P2 · **Depends on:** TASK-031
- [ ] Provide authorized reviewers with relevant evidence.
- [ ] Store outcomes, notes, and audit history.
- [ ] Add correction/appeal path where required.
- [ ] Restrict access to sensitive evidence.

**Acceptance:** Review decisions are audited and cannot be changed by unauthorized users.

## 12. M9 — Dashboards and Reports

### TASK-033 — Learner dashboard
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-021, TASK-023, TASK-024
- [ ] Show courses, progress, assessment history, mastery, and recommendations.
- [ ] Include loading, empty, error, and stale-data states.

**Acceptance:** Values come from authorized APIs; missing data is not fabricated.

### TASK-034 — Trainer dashboard
**Status:** TODO · **Priority:** P1 · **Depends on:** TASK-010, TASK-018, TASK-021
- [ ] Show course participation and assessment summaries.
- [ ] Show drafts awaiting review.
- [ ] Provide authorized learner progress views.
- [ ] Minimize unnecessary personal data.

**Acceptance:** Trainers see only assigned/authorized courses and accurate aggregates.

### TASK-035 — Reports and export
**Status:** TODO · **Priority:** P2 · **Depends on:** TASK-033, TASK-034
- [ ] Define approved reports and formats.
- [ ] Enforce authorization and data minimization.
- [ ] Use private storage and expiring links for exports.
- [ ] Audit privileged exports where required.

**Acceptance:** Export contains only permitted data for the requester.

## 13. M10 — Hardening and Release

### TASK-036 — Security verification
**Status:** TODO · **Priority:** P0 before production
- [ ] Test auth bypass and privilege escalation.
- [ ] Test cross-user/course access and RLS.
- [ ] Test answer-key and hidden-test leakage.
- [ ] Test uploads/private files and prompt injection.
- [ ] Test rate limits, abuse cases, and code isolation.

**Acceptance:** High-severity findings are fixed; accepted risks have documented owners.

### TASK-037 — Accessibility and usability
**Status:** TODO · **Priority:** P1 before release
- [ ] Check keyboard navigation, focus, labels, errors, and contrast.
- [ ] Check responsive layouts and assessment/editor status messaging.
- [ ] Verify recoverable errors and empty states.

**Acceptance:** Core learning flows do not rely solely on color or pointer input.

### TASK-038 — Monitoring and cost controls
**Status:** TODO · **Priority:** P1 before production
- [ ] Add health/readiness checks.
- [ ] Track request IDs, error categories, latency, and job failures.
- [ ] Track AI usage/cost and enforce limits.
- [ ] Alert on sustained failures and abnormal resource use.
- [ ] Document retention, backup, and incident responsibilities.

**Acceptance:** Failures can be diagnosed without logging secrets or full sensitive learner content.

### TASK-039 — Staging and production deployment
**Status:** TODO · **Priority:** P1 before release · **Depends on:** TASK-004, TASK-006, TASK-036, TASK-038
- [ ] Configure environment-specific credentials.
- [ ] Apply migrations in documented order.
- [ ] Configure CORS, auth redirects, storage policies, and integrations.
- [ ] Verify rollback/recovery and post-deploy smoke tests.

**Acceptance:** Production secrets are separate from development; deployment can be verified and rolled back.

### TASK-040 — End-to-end acceptance
**Status:** TODO · **Priority:** P0 before release
- [ ] Sign in and access an enrolled course.
- [ ] View concepts/prerequisites.
- [ ] Complete learning activity and assessment.
- [ ] Verify grading, mastery updates, and recommendations.
- [ ] Verify coding execution/replay if enabled.
- [ ] Verify AI viva/review if enabled.
- [ ] Test forbidden access and protected-data leakage.
- [ ] Fix failures and repeat tests.

**Acceptance:** All release-blocking flows pass; deferred/disabled features are documented.

## 14. MVP Release Gate

- [ ] Authentication, roles, and RLS are verified.
- [ ] Course, syllabus, concept, and prerequisite workflows work.
- [ ] Learning resources/questions can be reviewed before publication.
- [ ] Assessments can be started, answered, submitted, and graded safely.
- [ ] Mastery evidence is traceable and updates are idempotent.
- [ ] Recommendations respect prerequisites and access.
- [ ] Coding execution is isolated and hidden tests private if coding is in MVP.
- [ ] Editor replay follows privacy/access rules if included in MVP.
- [ ] AI viva follows rubric and review requirements if included in MVP.
- [ ] Integrity signals never automatically determine misconduct.
- [ ] Critical security and end-to-end tests pass.
- [ ] Deployment and rollback instructions exist.

## 15. Decisions and Blockers

| ID | Decision/blocker | Impacted tasks | Status |
|---|---|---|---|
| D-001 | Confirm AI provider and structured-output capabilities | TASK-016, TASK-029, TASK-030 | OPEN |
| D-002 | Confirm job mechanism compatible with hosting | TASK-012, TASK-019 | OPEN |
| D-003 | Confirm supported coding languages and Judge0 configuration | TASK-025–TASK-027 | OPEN |
| D-004 | Confirm advanced features required in MVP | TASK-028–TASK-035 | OPEN |
| D-005 | Create/maintain `TESTING.md` and `SECURITY.md` | TASK-006, TASK-036–TASK-040 | OPEN |

Resolve each decision with a rationale; do not invent values just to clear a blocker.

## 16. AI Agent Execution Protocol

When asked to implement a task:
1. Read `AGENT.md` and relevant specifications.
2. Inspect repository state and task status.
3. Verify dependencies and plan the smallest safe change.
4. Implement only the requested task and necessary support work.
5. Add/update tests and migrations as needed.
6. Run relevant checks and report actual results.
7. Mark `DONE` only after acceptance criteria are verified.
8. Report files changed, tests run, required configuration, and limitations.
9. If a specification conflict or unsafe assumption appears, record it as a blocker rather than silently changing product/security policy.
