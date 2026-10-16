# TESTING.md
## Testing Strategy — Adaptive Learning and Assessment Portal

**Status:** Initial testing plan  
**Audience:** Developers, AI coding agents, QA reviewers  
**Purpose:** Define how correctness, security, privacy, and reliability are verified throughout development.

> This is a test plan, not evidence that tests have already been implemented or passed. Inspect the repository and adapt test commands/tools to the actual stack. Follow `AGENT.md`, `PRD.md`, `Architecture.md`, `DATABASE.md`, `API_SPEC.md`, `ENVIRONMENT.md`, `AI_IMPLEMENTATION.md`, and `TASKS.md`.

---

## 1. Testing Principles

1. Test behavior, not just implementation details.
2. Test authorization at the API and database layers; hiding UI controls is not security.
3. Use deterministic tests for permissions, scoring, state transitions, and business rules.
4. Treat AI outputs as untrusted and validate them against runtime schemas.
5. Never use production learner data, secrets, real answer keys, or private files in test fixtures.
6. Use mocks for external AI providers and code-execution services in ordinary unit tests; keep a small, controlled integration suite for real services.
7. Test failure cases, retries, duplicate requests, and partial failures—not only the happy path.
8. Never execute untrusted student code in the application process or ordinary test runner.
9. Keep tests reproducible, isolated, and safe to run locally and in CI.
10. A task is not `DONE` until its acceptance criteria and relevant tests have been verified.

## 2. Test Levels

| Level | Purpose | Examples |
|---|---|---|
| Static checks | Catch syntax and style errors | ESLint checks, lint, formatting |
| Unit tests | Verify a single function/service | Scoring, schema validation, mastery calculations |
| Integration tests | Verify collaborating components | API + database, auth + RLS, job worker + persistence |
| Contract tests | Verify API request/response compatibility | Required fields, status codes, error envelope |
| End-to-end tests | Verify complete user journeys | Sign in → course → assessment → result |
| Security tests | Verify boundaries and abuse handling | Cross-user access, answer-key leakage, rate limits |
| AI evaluation tests | Assess output quality and grounding | Citation accuracy, schema adherence, rubric consistency |
| Performance tests | Check latency and resource behavior | API load, concurrent jobs, code-runner limits |
| Accessibility tests | Verify inclusive interaction | Keyboard access, labels, focus, contrast |

Use the test framework already present in the repository when possible. Do not add duplicate frameworks without a reason.

---

## 3. Test Environment and Data

### 3.1 Environments

- **Local:** Unit tests, mocked integrations, and developer testing.
- **CI:** Repeatable static checks, unit tests, and safe integration tests.
- **Staging:** Production-like configuration with synthetic data and controlled external services.
- **Production:** Monitoring and carefully approved smoke checks only; never run destructive test suites.

Keep environment variables separate by environment. Never commit `.env` files containing secrets.

### 3.2 Test data

Create synthetic fixtures for:
- Learner, trainer, and administrator roles where applicable.
- Two or more courses with different enrollments.
- Concepts with valid prerequisites and attempted cyclic prerequisites.
- Published and draft resources/questions.
- Assessments with different question types and attempt limits.
- Multiple learners with separate attempts and mastery records.
- AI outputs that are valid, malformed, unsupported, too long, and refused.
- Coding submissions that compile, fail, time out, and exceed configured limits.
- Integrity signals with different levels of uncertainty.

Use stable identifiers and resettable fixtures. Tests should not depend on execution order.

### 3.3 Supabase testing

- Prefer a local/test Supabase project or an isolated test database.
- Apply migrations from a clean database as part of CI where feasible.
- Test RLS using the same authentication context and access patterns used by the application.
- Use service-role credentials only in controlled server-side test setup; never expose them to browser tests.
- Ensure test cleanup cannot target production.

---

## 4. Minimum Checks for Every Change

Before marking a task complete, run the checks supported by the repository:

- [ ] Lint or static analysis.
- [ ] Code linting and syntax validation.
- [ ] Relevant unit tests.
- [ ] Relevant integration/contract tests.
- [ ] Build.
- [ ] Manual or automated verification of acceptance criteria.
- [ ] Authorization/security checks for data-access changes.
- [ ] Migration validation for schema changes.
- [ ] Documentation updates if behavior/configuration changed.

Record the actual commands and results in the task/PR summary. Do not claim a check passed if it was not run.

---

## 5. Authentication and Authorization Tests

### Authentication
- [ ] Protected endpoint rejects missing credentials.
- [ ] Protected endpoint rejects malformed, invalid, or expired tokens.
- [ ] Valid session can access permitted resources.
- [ ] Sign-out/session expiration removes protected access.
- [ ] User identity comes from the verified token, not a client-supplied user ID.

### Roles and ownership
- [ ] Learner cannot invoke trainer/admin operations.
- [ ] User cannot grant themselves a privileged role.
- [ ] Trainer can manage only assigned/authorized courses.
- [ ] Learner cannot read another learner's profile, attempt, submission, mastery history, or private files.
- [ ] Course membership/enrollment is checked server-side.
- [ ] Changing a resource ID to another user's ID does not grant access.
- [ ] Error responses do not reveal whether sensitive records exist unless policy permits it.

### Supabase RLS
- [ ] RLS is enabled on every exposed table that requires it.
- [ ] Anonymous access is denied unless explicitly intended.
- [ ] Select, insert, update, and delete policies are tested separately.
- [ ] Policies prevent cross-course and cross-user access.
- [ ] Views, functions, storage policies, and joins do not bypass intended boundaries.
- [ ] Privileged server operations are narrowly scoped and audited.

**Release blocker:** Any reproducible unauthorized cross-user or cross-course access must be fixed before release.

---

## 6. Database and Migration Tests

- [ ] All migrations apply successfully to a clean test database.
- [ ] Constraints reject invalid references and invalid enum/status values.
- [ ] Foreign-key relationships behave as specified.
- [ ] Uniqueness constraints prevent duplicate records where required.
- [ ] Prerequisite graph validation rejects self-links and cycles.
- [ ] Transactions preserve consistency for attempt finalization and mastery updates.
- [ ] Reprocessing the same event/evidence is idempotent.
- [ ] Historical attempts remain associated with the correct question versions.
- [ ] Mastery history and audit history remain append-only where required.
- [ ] Indexes exist for demonstrated query patterns.
- [ ] Seed/test fixtures never run against production accidentally.

---

## 7. API Contract Tests

For each endpoint in `API_SPEC.md`, verify:
- [ ] HTTP method and route are correct.
- [ ] Required fields, types, enums, and limits are validated.
- [ ] Unknown or forbidden fields are rejected or safely ignored according to policy.
- [ ] Success response matches the documented schema.
- [ ] Error response matches the standard error envelope.
- [ ] Correct status codes are used.
- [ ] Authentication and role checks run before protected operations.
- [ ] Pagination limits and sort/filter allowlists are enforced.
- [ ] Duplicate requests are safe where idempotency is expected.
- [ ] Rate limits apply to expensive or abuse-prone operations.
- [ ] Server logs contain useful request IDs but no secrets or sensitive payloads.

Use contract tests to detect drift between frontend expectations, backend implementation, and `API_SPEC.md`.

---

## 8. Syllabus and File Processing Tests

- [ ] Accept only configured file types and size limits.
- [ ] Reject unsupported, empty, malformed, or oversized files.
- [ ] Validate MIME type and file signature where supported.
- [ ] Unauthorized users cannot upload to or read another course's documents.
- [ ] Private storage links expire and are scoped appropriately.
- [ ] Parsing failure updates job status safely and allows controlled retry.
- [ ] Page/section source metadata is preserved where supported.
- [ ] Duplicate upload/retry does not create duplicate syllabus content.
- [ ] Extracted content is saved as a draft until required approval.
- [ ] Source references actually correspond to the stored parsed document.
- [ ] Embedded prompt-injection instructions are treated as untrusted document text.
- [ ] Temporary files and extracted text follow retention/cleanup policy.

---

## 9. AI Integration and Output Quality Tests

### Provider adapter
- [ ] Successful structured response is parsed and validated.
- [ ] Timeout produces a safe retryable status.
- [ ] Rate limiting uses bounded backoff and respects retry limits.
- [ ] Permanent provider errors are not retried indefinitely.
- [ ] Invalid credentials fail safely.
- [ ] Malformed, empty, oversized, and schema-invalid outputs are rejected.
- [ ] Retries do not duplicate persisted results.
- [ ] Provider failure does not crash unrelated endpoints.
- [ ] Budget, concurrency, input, and output limits are enforced.
- [ ] Provider keys and full prompts are not leaked in logs or client responses.

### Grounding and prompt injection
- [ ] Generated claims are supported by retrieved/authorized sources when grounding is required.
- [ ] Missing evidence is reported rather than fabricated.
- [ ] Source references point to the correct document/version/page/section.
- [ ] Prompt-injection content in uploads, retrieved text, code, or learner responses cannot override system rules.
- [ ] Retrieval filters enforce course and user permissions before data is sent to the model.
- [ ] Cross-course data cannot enter another course's prompt context.

### Syllabus extraction
- [ ] Valid modules, objectives, concepts, and prerequisites are extracted.
- [ ] Duplicate concepts are detected or normalized.
- [ ] Invalid prerequisite references and cycles are rejected.
- [ ] Ambiguous or unsupported output is flagged for review.

### Content and question generation
- [ ] Required fields and enum values are validated.
- [ ] Option IDs are unique and correct-answer IDs exist.
- [ ] Single-answer/multiple-answer rules match question type.
- [ ] Generated questions have plausible explanations and concept links.
- [ ] Near-duplicate questions are detected where supported.
- [ ] Generated content remains draft until approval.
- [ ] Learner-visible APIs do not expose answer keys, hidden rubrics, or internal prompts.

### Evaluation process
Maintain a versioned, privacy-safe evaluation set. Compare prompt/model versions on:
- Schema adherence
- Factual accuracy against source
- Citation/source accuracy
- Pedagogical clarity
- Question/answer correctness
- Refusal and uncertainty behavior
- Latency, failure rate, and cost

Do not use a single aggregate score as the only release criterion. Use human review for pedagogical quality and high-impact outputs.

---

## 10. Assessment and Grading Tests

- [ ] Only authorized learners can start an assessment.
- [ ] Draft/unpublished assessments cannot be started.
- [ ] Attempt limits and availability windows are enforced server-side.
- [ ] Client clock changes cannot bypass server-side timing rules.
- [ ] Answers are associated with the correct attempt and question version.
- [ ] Invalid question IDs and malformed answers are rejected.
- [ ] Repeated answer-save requests do not corrupt state.
- [ ] Submission/finalization is idempotent.
- [ ] Concurrent submissions do not double-grade or create duplicate results.
- [ ] Objective scoring is deterministic and covered with boundary cases.
- [ ] Rubric-based scores stay within configured bounds.
- [ ] Feedback and correct answers are revealed only when policy allows.
- [ ] Network interruption and retry behavior preserve valid saved work.
- [ ] Historical scores do not change silently when question content is edited.

---

## 11. Mastery and Recommendation Tests

### Mastery
- [ ] Correct/incorrect evidence updates the intended concept.
- [ ] Evidence from unauthorized or unfinished attempts is rejected.
- [ ] Reprocessing evidence is idempotent.
- [ ] Values remain within configured bounds.
- [ ] Model parameters/version are recorded.
- [ ] History is retained according to schema requirements.
- [ ] Missing evidence does not create fabricated mastery.
- [ ] Same input and model version produce reproducible output where expected.

### Recommendations
- [ ] Only published and authorized activities are candidates.
- [ ] Prerequisite rules are enforced.
- [ ] Unavailable or completed activities are handled according to product rules.
- [ ] Empty candidate sets produce a useful fallback.
- [ ] AI explanation failure does not prevent deterministic recommendations.
- [ ] Explanations do not claim evidence the system does not have.
- [ ] Recommendations do not use sensitive or unrelated personal attributes.

---

## 12. Coding Assessment and Sandbox Tests

**Never execute untrusted student code in the Express process or in a privileged environment.**

- [ ] Only configured languages and versions are accepted.
- [ ] Source length, input size, and request rate are limited.
- [ ] CPU, memory, wall time, process count, and output size are bounded.
- [ ] Network access and privileged filesystem access are disabled unless explicitly required and safely controlled.
- [ ] Compilation errors, runtime errors, timeouts, and resource-limit events are handled.
- [ ] One user's code cannot read another user's files, environment variables, or results.
- [ ] Hidden test cases and expected outputs remain server-side.
- [ ] Public/sample test output is separated from hidden-test results.
- [ ] Repeated run requests cannot exhaust resources.
- [ ] Job status and results require correct ownership/authorization.
- [ ] Runner failure does not mark a submission as passed.
- [ ] AI feedback cannot override authoritative execution results.

**Release blocker:** Do not launch coding assessments until sandbox isolation and hidden-test confidentiality have been verified.

---

## 13. Editor Replay and Integrity Review Tests

### Editor replay
- [ ] Event payloads follow a versioned schema.
- [ ] Oversized, malformed, out-of-order, or unauthorized events are rejected or handled according to documented rules.
- [ ] Events are tied to the correct session and user.
- [ ] Event uploads are rate-limited and privacy-minimized.
- [ ] Replay access is restricted to the learner and authorized reviewers.
- [ ] Retention/deletion rules are enforced.

### Integrity review
- [ ] Signals include timestamps, source/method version, and uncertainty where applicable.
- [ ] One signal cannot automatically fail or penalize a learner.
- [ ] Review outcomes and reviewer identity are audited.
- [ ] Evidence access is restricted and logged.
- [ ] False positives, accessibility impacts, and ambiguous cases are tested.
- [ ] Correction/appeal path works where required.
- [ ] UI labels signals as review context, not conclusive proof.

---

## 14. AI Viva Tests

- [ ] Session ownership and duration are enforced.
- [ ] Questions stay within the approved course/objective scope.
- [ ] The model cannot access hidden answer keys or unrelated student data.
- [ ] Feedback matches the configured rubric and cites answer evidence where required.
- [ ] Scores and criterion IDs are validated server-side.
- [ ] Unsupported feedback claims are detected in evaluation cases.
- [ ] Provider timeout and refusal lead to safe recovery/termination.
- [ ] AI feedback is clearly labeled and review is available where required.
- [ ] No high-impact punitive decision relies solely on unreviewed model output.

---

## 15. Frontend, Accessibility, and End-to-End Tests

### Frontend
- [ ] Forms show field-level validation and accessible error messages.
- [ ] Loading, empty, success, and error states exist for important flows.
- [ ] Protected screens handle expired sessions.
- [ ] Buttons prevent accidental duplicate submissions where appropriate.
- [ ] UI never relies on client-side role checks as the only security boundary.
- [ ] API failures do not expose stack traces or secrets.

### Accessibility
- [ ] Core flows support keyboard navigation.
- [ ] Focus is visible and follows a logical order.
- [ ] Form fields have labels and errors are associated with fields.
- [ ] Color is not the only indicator of status.
- [ ] Contrast and responsive layouts are checked.
- [ ] Editor/assessment status is announced clearly where feasible.

### Minimum end-to-end journeys
1. Learner signs in and opens an enrolled course.
2. Learner views syllabus, concepts, and published resources.
3. Learner starts an assessment, saves answers, submits, and sees permitted results.
4. Finalized attempt produces traceable mastery evidence.
5. Recommendation engine returns eligible activities or a safe empty state.
6. Trainer creates/reviews content and publishes it.
7. Coding assessment executes in the isolated runner, if enabled.
8. Viva and integrity review workflows function with authorization, if enabled.
9. Cross-user and cross-course access attempts are denied.

---

## 16. Performance, Reliability, and Operational Tests

- [ ] Establish expected latency and concurrency targets before load testing.
- [ ] Test pagination and large course/question lists.
- [ ] Test concurrent assessment submissions and job creation.
- [ ] Verify timeouts for database, AI, storage, and code runner calls.
- [ ] Verify retry limits and circuit-breaker behavior where implemented.
- [ ] Verify job recovery after worker restart.
- [ ] Verify configured AI budget and concurrency limits.
- [ ] Check for unbounded queries, N+1 access patterns, and missing indexes.
- [ ] Ensure logs use request IDs and avoid secrets/sensitive full payloads.
- [ ] Verify health/readiness checks and operational alerts.

Do not set arbitrary performance targets without measuring the actual deployment and expected load.

---

## 17. Release Checklist

### Before staging
- [ ] Clean install and build pass.
- [ ] Static checks, lint checks, and unit tests pass.
- [ ] Migrations apply cleanly to a fresh test database.
- [ ] RLS and API authorization tests pass.
- [ ] AI tests use mocks or approved test credentials.
- [ ] No secrets are committed.
- [ ] Required environment variables and integrations are documented.

### Before production
- [ ] Critical end-to-end flows pass in staging.
- [ ] High-severity security findings are fixed.
- [ ] Answer-key and hidden-test leakage tests pass.
- [ ] Code runner isolation is verified if coding assessment is enabled.
- [ ] AI output validation, budgets, and safe fallbacks are enabled.
- [ ] Backup, retention, monitoring, and rollback procedures are documented.
- [ ] Deferred features and known limitations are explicitly listed.
- [ ] Final smoke tests and owner approval are recorded.

---

## 18. Test Report Template

Use this template in pull requests or task completion reports:

```text
Task/PR:
Scope:
Environment:
Commands executed:
- [command] — PASS/FAIL/NOT RUN

Tests:
- Unit:
- Integration:
- Contract:
- E2E:
- Security:

Manual acceptance checks:
Known issues/blockers:
Configuration/migrations required:
Data/security considerations:
Conclusion: PASS / FAIL / BLOCKED
```

Never report `PASS` when required checks were not run. Mark them `NOT RUN` and explain why.

---

## 19. AI Agent Testing Instructions

When implementing a task:

1. Read `AGENT.md`, `TASKS.md`, and the relevant specifications.
2. Inspect existing test tools and follow repository conventions.
3. Add tests for success, invalid input, authorization, and failure behavior.
4. Use mocks for external providers unless the task explicitly requires an integration test.
5. Never use real learner data or production credentials.
6. Run the smallest relevant test suite first, then broader checks as appropriate.
7. Report actual commands and results.
8. Do not weaken or delete tests just to make a change pass.
9. Do not mark a task `DONE` until its acceptance criteria are verified.
10. If a requirement is ambiguous or a security test fails, record the blocker and explain it.
