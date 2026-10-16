# API Specification — Adaptive Learning and Assessment Portal

**Document status:** Proposed implementation contract  
**Version:** 1.0.0  
**Last updated:** 2026-10-16  
**Audience:** Frontend developers, backend developers, AI coding agents, QA, and maintainers

> **Contract rule:** This document defines the intended REST API. Before implementing an endpoint, inspect the existing repository, migrations, and provider SDKs. If existing code or an approved request/response example conflicts with this document, stop and report the conflict instead of silently changing the contract. Update this file when a contract change is approved.

---

## 1. Purpose and scope

This document standardizes how the React/Vite frontend communicates with the Node.js/Express (JavaScript) backend for the Adaptive Learning and Assessment Portal. The platform supports course and syllabus management, concept graphs, AI-assisted learning content, assessments, adaptive mastery, recommendations, coding practice, integrity review, and AI viva.

The API uses JSON over HTTPS and REST-style resources. Supabase provides PostgreSQL, authentication, storage, and row-level security (RLS). Long-running work such as document processing, AI generation, and code execution should run asynchronously and be represented by job resources.

### 1.1 Proposed base URLs

- Local development: `http://localhost:3001/api/v1`
- Production: configure `API_BASE_URL`; do not hard-code a deployment URL in application code.

The `/api/v1` prefix is the proposed versioned API root. If the existing application has a different base path, preserve the implemented path until a change is approved.

### 1.2 Conventions

- JSON request and response bodies use `Content-Type: application/json` unless an upload endpoint explicitly requires `multipart/form-data`.
- Field names use `camelCase`.
- Resource IDs are opaque strings, normally UUIDs. Clients must not parse meaning from IDs.
- Timestamps use ISO 8601 UTC strings, e.g. `2026-10-16T10:30:00.000Z`.
- Durations are in milliseconds unless explicitly documented otherwise.
- Paginated collections use `data` and `pagination` fields.
- Optional fields may be omitted; `null` means an explicitly empty value where allowed. Do not silently switch between omitted and `null` semantics.
- API contracts must be validated at runtime on the server using runtime schema validation (e.g., Zod, Joi). Frontend or client-side checks alone are not sufficient.

---

## 2. Authentication and authorization

### 2.1 Authentication

Use Supabase Auth for identity. The frontend obtains a valid access token from the configured Supabase client and sends it to the API as a bearer token:

```http
Authorization: Bearer <supabase_access_token>
```

The Express API must verify the token using a trusted Supabase-supported verification method. Never trust a user ID, email, or role supplied only in the request body. The API must derive the authenticated user from the verified token.

Public endpoints, if any, must be explicitly designated. All other endpoints require authentication.

### 2.2 Roles

The initial authorization model includes:

- **Student:** access their own enrollments, learning progress, attempts, submissions, and recommendations.
- **Trainer:** manage only courses and content for which they have authorized trainer access; review generated content and student work within their scope.
- **Admin:** manage platform-level configuration and authorized administrative operations.

Role names and assignment rules must match the actual schema and trusted claims. Users must never be able to elevate their own role through profile updates or request payloads.

### 2.3 Authorization rules

1. Authenticate every protected request.
2. Authorize the action and resource scope on the server, not only in the UI.
3. Apply Supabase RLS to exposed tables and use least-privilege database access.
4. A student may access only their own private records unless a specific shared resource is intended.
5. Never return answer keys, hidden coding tests, private rubrics, evaluation secrets, model/provider keys, or other students' private records to students.
6. Trainer access must be scoped to assigned courses and permitted operations.
7. Service-role credentials must remain server-side and must never be included in frontend bundles or API responses.
8. Use separate authorization checks for reading, creating, updating, publishing, grading, and deleting resources.

### 2.4 Suggested authorization matrix

| Resource / action | Student | Trainer | Admin |
|---|---|---|---|
| Read published course content | Enrolled/authorized | Authorized courses | All permitted |
| Manage course structure | No | Assigned courses | Yes |
| Generate or review course content | No, unless explicitly enabled | Assigned courses | Yes |
| Take assessments | Own attempts | Preview/review where permitted | Authorized administration |
| View private answer keys / hidden tests | Never | Only through protected authoring/evaluation flows | Only when required |
| View mastery and recommendations | Own | Learners in assigned courses, as permitted | Authorized administration |
| View integrity evidence | No | Assigned review scope | Authorized administration |
| Manage platform roles/configuration | No | No | Yes |

This matrix is a policy baseline; implement only the permissions supported by the approved product requirements and schema.

---

## 3. Standard response envelopes

### 3.1 Successful single resource

```json
{
  "data": {
    "id": "resource_uuid",
    "name": "Example"
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

### 3.2 Successful collection

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

### 3.3 Error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "issue": "Required"
      }
    ]
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Error details must be safe for clients. Do not return stack traces, SQL text, access tokens, secrets, hidden test cases, raw provider responses containing sensitive data, or internal infrastructure details.

### 3.4 HTTP status codes

| Status | Meaning | Typical use |
|---|---|---|
| `200 OK` | Request succeeded | Reads and successful updates |
| `201 Created` | Resource created | Resource creation |
| `202 Accepted` | Work accepted asynchronously | AI generation, document processing, code execution |
| `204 No Content` | Success with no response body | Successful deletion where appropriate |
| `400 Bad Request` | Malformed request or invalid query syntax | Invalid JSON or malformed parameters |
| `401 Unauthorized` | Missing, invalid, or expired authentication | Token verification failure |
| `403 Forbidden` | Authenticated but not allowed | Role/scope restriction |
| `404 Not Found` | Resource does not exist or is not visible to caller | Unknown/out-of-scope resource; avoid leaking existence where appropriate |
| `409 Conflict` | State conflict | Duplicate operation, stale version, invalid state transition |
| `413 Payload Too Large` | Request exceeds configured size limit | Oversized upload/body |
| `415 Unsupported Media Type` | Unsupported content type | Invalid upload format |
| `422 Unprocessable Entity` | Valid JSON but semantically invalid input | Invalid assessment state or domain rule |
| `429 Too Many Requests` | Rate limit exceeded | AI generation or repeated attempts |
| `500 Internal Server Error` | Unexpected server failure | Generic unhandled error |
| `502 Bad Gateway` | Upstream provider failure | External AI/execution provider unavailable |
| `503 Service Unavailable` | Temporarily unavailable | Maintenance or capacity limits |
| `504 Gateway Timeout` | Upstream request timed out | External provider timeout |

Use status codes consistently. Do not return `200` for failed operations.

---

## 4. Pagination, filtering, and sorting

For list endpoints, use cursor pagination by default:

```http
GET /api/v1/courses?limit=20&cursor=<opaque_cursor>&search=algebra
```

Rules:

- Default `limit`: 20; maximum recommended limit: 100.
- `cursor` is opaque and must not be constructed by clients.
- Return `nextCursor: null` and `hasMore: false` when no further page exists.
- Allowlist sortable fields; never interpolate client-provided sort strings directly into SQL.
- Define endpoint-specific filters in each resource contract.
- Use stable ordering with a unique tie-breaker, usually the resource ID.

For APIs with small bounded collections, offset pagination may be acceptable if explicitly documented.

---

## 5. Resource and endpoint catalogue

The following routes are the proposed v1 contract. Implement endpoints incrementally according to the approved task list. Do not create every endpoint automatically if it is outside the current scope.

### 5.1 Health and session

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness check; no secrets or detailed infrastructure data |
| `GET` | `/ready` | Internal/controlled | Readiness check for required dependencies |
| `GET` | `/me` | Required | Return the authenticated user's safe profile and effective permissions |
| `PATCH` | `/me` | Required | Update allowlisted user-editable profile fields only |

`PATCH /me` must reject protected fields such as `role`, `isAdmin`, account ownership IDs, or security configuration.

### 5.2 Courses and enrollments

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/courses` | Required or explicitly public | List courses visible to the caller |
| `POST` | `/courses` | Trainer/Admin | Create a course |
| `GET` | `/courses/:courseId` | Required | Read a visible course |
| `PATCH` | `/courses/:courseId` | Authorized Trainer/Admin | Update course metadata |
| `POST` | `/courses/:courseId/publish` | Authorized Trainer/Admin | Publish an approved course version |
| `POST` | `/courses/:courseId/enrollments` | Student or authorized Trainer/Admin | Enroll a student according to policy |
| `GET` | `/courses/:courseId/enrollments` | Authorized Trainer/Admin | List course enrollments within scope |
| `GET` | `/me/enrollments` | Student | List the current user's enrollments |

Course creation and update must validate title, description, visibility, ownership, and state transitions. Publishing should reference an immutable or versioned course snapshot where supported by the database model.

Example `POST /courses` request:

```json
{
  "title": "Introduction to Data Structures",
  "description": "Core data structures and problem solving.",
  "visibility": "private"
}
```

Example response (`201 Created`):

```json
{
  "data": {
    "id": "course_uuid",
    "title": "Introduction to Data Structures",
    "description": "Core data structures and problem solving.",
    "visibility": "private",
    "status": "draft",
    "createdAt": "2026-10-16T10:30:00.000Z"
  },
  "meta": { "requestId": "req_01J..." }
}
```

### 5.3 Syllabus, modules, concepts, and prerequisites

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/courses/:courseId/syllabus` | Authorized course user | Read syllabus tree and version |
| `PUT` | `/courses/:courseId/syllabus` | Authorized Trainer/Admin | Create or replace a draft syllabus structure, subject to version rules |
| `POST` | `/courses/:courseId/syllabus/imports` | Authorized Trainer/Admin | Start syllabus document import/processing |
| `GET` | `/syllabus-imports/:jobId` | Owner/authorized Trainer/Admin | Get import status and result summary |
| `GET` | `/courses/:courseId/concepts` | Authorized course user | List concepts and learning objectives |
| `POST` | `/courses/:courseId/concepts` | Authorized Trainer/Admin | Create a concept |
| `PATCH` | `/concepts/:conceptId` | Authorized Trainer/Admin | Update a concept |
| `PUT` | `/concepts/:conceptId/prerequisites` | Authorized Trainer/Admin | Set prerequisite edges with cycle validation |
| `GET` | `/courses/:courseId/concept-graph` | Authorized course user | Return graph nodes and edges for visualization |

Syllabus import should return `202 Accepted` with a job ID. Validate file type, size, content, ownership, and malware-scanning status where available. A prerequisite update must reject self-links and cycles. Do not overwrite a published syllabus version in place; create a new version or follow the approved versioning model.

Example `POST /courses/:courseId/syllabus/imports` request metadata (upload encoding may be multipart):

```json
{
  "sourceType": "pdf",
  "originalFileName": "course-syllabus.pdf"
}
```

Example `202 Accepted`:

```json
{
  "data": {
    "jobId": "job_uuid",
    "status": "queued",
    "statusUrl": "/api/v1/syllabus-imports/job_uuid"
  },
  "meta": { "requestId": "req_01J..." }
}
```

### 5.4 Learning resources and AI-generated content

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/concepts/:conceptId/resources` | Authorized course user | List approved resources for a concept |
| `POST` | `/concepts/:conceptId/resources` | Authorized Trainer/Admin | Add a resource or start generation, according to resource type |
| `POST` | `/courses/:courseId/content-generation-jobs` | Authorized Trainer/Admin | Start AI generation for selected concepts/content types |
| `GET` | `/content-generation-jobs/:jobId` | Job owner/authorized Trainer/Admin | Check generation status |
| `GET` | `/content-drafts/:draftId` | Authorized Trainer/Admin | Read generated draft and provenance |
| `POST` | `/content-drafts/:draftId/approve` | Authorized Trainer/Admin | Approve a draft for publication |
| `POST` | `/content-drafts/:draftId/reject` | Authorized Trainer/Admin | Reject a draft with reason |
| `GET` | `/concepts/:conceptId/learning-content` | Authorized course user | Read approved content only |

AI generation is asynchronous. The response must expose status and a stable job identifier, not block until generation finishes. Drafts must not become student-visible until required validation and trainer approval are complete. Store provider/model metadata and source references when required, but never expose provider secrets.

Example generation request:

```json
{
  "conceptIds": ["concept_uuid_1", "concept_uuid_2"],
  "contentTypes": ["theory", "worked_examples", "practice_questions"],
  "difficulty": "beginner",
  "language": "en"
}
```

Example response:

```json
{
  "data": {
    "jobId": "generation_job_uuid",
    "status": "queued"
  },
  "meta": { "requestId": "req_01J..." }
}
```

### 5.5 Question bank and assessment authoring

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/courses/:courseId/questions` | Authorized Trainer/Admin | Search/manage question bank |
| `POST` | `/courses/:courseId/questions` | Authorized Trainer/Admin | Create question and version |
| `GET` | `/questions/:questionId` | Context-dependent | Read only fields the caller is authorized to see |
| `PATCH` | `/questions/:questionId` | Authorized Trainer/Admin | Create/update draft version under versioning rules |
| `POST` | `/courses/:courseId/question-generation-jobs` | Authorized Trainer/Admin | Start AI question generation |
| `GET` | `/question-generation-jobs/:jobId` | Authorized Trainer/Admin | Read generation status |
| `GET` | `/assessments` | Enrolled student or authorized Trainer/Admin | List assessments visible to caller |
| `POST` | `/courses/:courseId/assessments` | Authorized Trainer/Admin | Create assessment draft |
| `GET` | `/assessments/:assessmentId` | Context-dependent | Read permitted assessment metadata and questions |
| `PATCH` | `/assessments/:assessmentId` | Authorized Trainer/Admin | Update draft assessment |
| `POST` | `/assessments/:assessmentId/publish` | Authorized Trainer/Admin | Publish assessment version |

Question payloads must be role-aware. Student-facing assessment payloads must omit correct answers, private rubrics, hidden test cases, grading secrets, and internal evaluation fields. Question and assessment versioning must preserve the exact content used in an existing attempt.

### 5.6 Test series

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/test-series` | Required | List test series visible to caller |
| `GET` | `/test-series/:testSeriesId` | Required | Read visible test series and its published assessments |
| `POST` | `/courses/:courseId/test-series` | Authorized Trainer/Admin | Create test series |
| `PATCH` | `/test-series/:testSeriesId` | Authorized Trainer/Admin | Update draft test series |
| `POST` | `/test-series/:testSeriesId/publish` | Authorized Trainer/Admin | Publish test series |

### 5.7 Assessment attempts and answers

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/assessments/:assessmentId/attempts` | Enrolled Student | Start an attempt if eligible |
| `GET` | `/attempts/:attemptId` | Attempt owner or authorized reviewer | Read attempt state and permitted details |
| `PUT` | `/attempts/:attemptId/answers/:questionId` | Attempt owner, active attempt | Save or replace the student's answer |
| `POST` | `/attempts/:attemptId/submit` | Attempt owner, active attempt | Submit and finalize attempt |
| `GET` | `/attempts/:attemptId/result` | Attempt owner after release, or authorized reviewer | Read result according to release policy |
| `GET` | `/me/attempts` | Student | List the current user's attempts |

The server must enforce attempt ownership, assessment availability, attempt limits, deadlines, allowed state transitions, and idempotent final submission. Do not trust client-side score, elapsed time, or correct-answer fields. Use server-side grading for objective items and protected grading workflows for subjective/coding questions.

Example start request (optional client idempotency key may be supplied in a header):

```http
POST /api/v1/assessments/assessment_uuid/attempts
Authorization: Bearer <token>
Idempotency-Key: 4b21d9b4-...
```

Example response (`201 Created`):

```json
{
  "data": {
    "id": "attempt_uuid",
    "assessmentId": "assessment_uuid",
    "status": "in_progress",
    "startedAt": "2026-10-16T10:30:00.000Z",
    "expiresAt": "2026-10-16T11:00:00.000Z"
  },
  "meta": { "requestId": "req_01J..." }
}
```

Example answer save request:

```json
{
  "answer": {
    "selectedOptionIds": ["option_uuid"],
    "text": null
  }
}
```

The accepted answer shape is question-type-specific. Reject fields that do not apply to the question type and never accept `isCorrect`, `score`, `answerKey`, or equivalent client-supplied grading fields.

### 5.8 Mastery and adaptive recommendations

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/me/mastery` | Student | Read the current user's mastery summary |
| `GET` | `/me/mastery/concepts/:conceptId` | Student | Read mastery for one concept |
| `GET` | `/courses/:courseId/students/:studentId/mastery` | Authorized Trainer/Admin | Read learner mastery within authorized course scope |
| `GET` | `/me/recommendations` | Student | Get prioritized next learning actions |
| `POST` | `/me/recommendations/:recommendationId/feedback` | Student | Record recommendation feedback |

Mastery is a model-derived estimate, not an absolute statement of ability. Responses should include a score/probability only when defined by the selected model, along with model/version and `updatedAt` where available. Recommendations should include a reason and supporting evidence references where appropriate. Do not let clients directly set mastery values.

Example response:

```json
{
  "data": [
    {
      "conceptId": "concept_uuid",
      "masteryProbability": 0.72,
      "modelVersion": "bkt-v1",
      "updatedAt": "2026-10-16T10:30:00.000Z"
    }
  ],
  "meta": { "requestId": "req_01J..." }
}
```

### 5.9 Coding sessions and isolated execution

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/assessments/:assessmentId/coding-sessions` | Authorized Student | Start a coding session for an eligible assessment/task |
| `GET` | `/coding-sessions/:sessionId` | Session owner or authorized reviewer | Read session metadata |
| `POST` | `/coding-sessions/:sessionId/events` | Session owner | Append approved editor events for replay, with size/rate limits |
| `POST` | `/coding-sessions/:sessionId/submissions` | Session owner | Create a code submission |
| `GET` | `/submissions/:submissionId` | Submission owner or authorized reviewer | Read submission status and safe result summary |
| `GET` | `/submissions/:submissionId/results` | Submission owner or authorized reviewer | Read permitted test results |
| `POST` | `/submissions/:submissionId/run` | Submission owner, if allowed | Queue an execution job |
| `GET` | `/execution-jobs/:jobId` | Job owner or authorized reviewer | Poll execution status |

Code execution must occur in an isolated external runner such as Judge0 or an equivalent sandbox, never inside the Express process or with unrestricted server privileges. Enforce CPU, memory, wall-clock, output, process, and network restrictions. Never return hidden test inputs/outputs or private grader implementation to students. Return only authorized summaries such as passed/total counts, safe compiler output, and public-test feedback.

Example submission request:

```json
{
  "language": "cpp",
  "sourceCode": "#include <iostream>\nint main(){ std::cout << \"Hello\"; }",
  "taskVersionId": "task_version_uuid"
}
```

Example response (`202 Accepted`):

```json
{
  "data": {
    "submissionId": "submission_uuid",
    "executionJobId": "execution_job_uuid",
    "status": "queued"
  },
  "meta": { "requestId": "req_01J..." }
}
```

### 5.10 Integrity signals and review

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/attempts/:attemptId/integrity-signals` | Attempt owner / trusted client | Submit a supported integrity signal |
| `GET` | `/attempts/:attemptId/integrity-summary` | Authorized Trainer/Admin | Read a privacy-limited summary within scope |
| `POST` | `/integrity-reviews` | Authorized Trainer/Admin | Create a human review record |
| `PATCH` | `/integrity-reviews/:reviewId` | Authorized reviewer | Record review outcome and rationale |

Integrity events must be validated, rate-limited, and minimized. Record source and timestamps when needed. A signal is not proof of misconduct: automated signals must not directly impose penalties or determine guilt. Restrict access to evidence and preserve an audit trail for review decisions.

### 5.11 AI viva

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/attempts/:attemptId/viva-sessions` | Attempt owner, if enabled | Start a viva session for an eligible attempt |
| `GET` | `/viva-sessions/:sessionId` | Session owner or authorized reviewer | Read session state |
| `POST` | `/viva-sessions/:sessionId/answers` | Session owner | Submit a response to the current viva question |
| `POST` | `/viva-sessions/:sessionId/complete` | Session owner or controlled system action | Complete the session |
| `GET` | `/viva-sessions/:sessionId/report` | Session owner after release, or authorized reviewer | Read released report |

Viva prompts and scoring must follow the approved assessment policy. Do not expose hidden evaluation prompts, protected rubrics, or model internals. If audio is added, explicitly define upload limits, retention, consent, and transcription access before implementation.

### 5.12 Trainer dashboards and reporting

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/trainer/courses/:courseId/dashboard` | Authorized Trainer/Admin | Course-level progress summary |
| `GET` | `/trainer/courses/:courseId/assessments/:assessmentId/analytics` | Authorized Trainer/Admin | Assessment performance analytics |
| `GET` | `/trainer/courses/:courseId/students` | Authorized Trainer/Admin | Roster and permitted progress summary |
| `GET` | `/admin/overview` | Admin | Platform-level operational summary |

Aggregate endpoints must enforce scope and avoid exposing unnecessary personal data. Apply pagination or aggregation for large datasets. Analytics should be computed server-side and must not reveal protected answer keys or hidden tests.

---

## 6. Asynchronous job contract

Use a common job model for syllabus imports, AI content/question generation, and code execution. A job may use the following status set:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled` (only if cancellation is supported)

Example job resource:

```json
{
  "data": {
    "id": "job_uuid",
    "type": "content_generation",
    "status": "running",
    "progress": {
      "completed": 2,
      "total": 5
    },
    "createdAt": "2026-10-16T10:30:00.000Z",
    "updatedAt": "2026-10-16T10:31:00.000Z",
    "result": null,
    "error": null
  },
  "meta": { "requestId": "req_01J..." }
}
```

Rules:

1. Return `202 Accepted` when a job is queued.
2. The client polls the documented status URL with bounded exponential backoff or uses an approved push mechanism.
3. Progress values must be meaningful and remain within documented bounds.
4. Terminal states must be stable; retries should be explicit and auditable.
5. Error details must be safe and actionable without leaking provider credentials or internal prompts.
6. Check ownership/authorization on every job read.
7. Support idempotency for operations where duplicate jobs would be costly or harmful.

---

## 7. Request validation and domain rules

- Validate request bodies, path parameters, query parameters, and uploaded files at the API boundary using a runtime schema validator such as Zod or an equivalent approved library.
- Reject unknown or protected fields for security-sensitive mutations rather than silently accepting them.
- Trim and length-limit text fields; normalize enums and reject unsupported values.
- Enforce database foreign keys, uniqueness, ownership, and state transitions in addition to request validation.
- Validate that referenced course, concept, question, assessment, attempt, and version IDs belong together.
- Validate prerequisite graphs for cycles.
- Validate question-specific answer formats on the server.
- Enforce attempt windows, deadlines, attempt limits, and finalization rules on the server.
- Limit request body size, upload size, event batch size, source-code size, and response output size.
- Never trust client-calculated marks, mastery scores, elapsed time, role, or integrity verdicts.
- Avoid destructive cascading changes without an explicitly approved domain rule.

---

## 8. Idempotency, concurrency, and state transitions

For costly or non-repeatable writes, support an `Idempotency-Key` request header. The server should store the key, authenticated actor, operation scope, and result for a bounded retention period. Reuse with a different payload should return `409 Conflict`.

Use optimistic concurrency for editable/versioned resources where appropriate. A resource may expose `version` or an ETag; clients should send the observed version or `If-Match` when updating. If the stored version changed, return `409 Conflict` and include a safe explanation.

State transitions must be explicitly defined. Examples:

- Draft assessment → published assessment → closed/archived, according to policy.
- In-progress attempt → submitted → graded/released, according to grading workflow.
- Queued job → running → succeeded/failed.

Reject illegal transitions with `409 Conflict` or `422 Unprocessable Entity` as appropriate. Final submission and grading operations must be transaction-safe and retry-safe.

---

## 9. Security and privacy requirements

1. Enforce HTTPS in production.
2. Verify Supabase access tokens on the server.
3. Use RLS and server-side authorization; never rely on frontend route guards as security controls.
4. Keep Supabase service-role keys, AI provider keys, execution provider credentials, and signing secrets in server-side environment variables or a secret manager.
5. Configure CORS with explicit trusted frontend origins; do not use wildcard origins with credentialed requests.
6. Apply rate limits to authentication-adjacent endpoints, uploads, AI generation, answer submissions, integrity events, and code execution.
7. Sanitize log fields and never log tokens, passwords, raw secrets, or unnecessary sensitive learning content.
8. Use private object storage for non-public syllabus uploads and sensitive evidence; issue short-lived signed URLs only after authorization.
9. Validate file MIME type and content, extension, size, and storage ownership; do not trust the client-provided filename.
10. Protect against SQL injection with parameterized queries or safe query builders.
11. Add request IDs and structured logs for traceability.
12. Retain only the personal data and evidence needed for the documented purpose; define deletion and retention behavior.
13. Treat integrity flags as review signals, not automatic proof of wrongdoing.
14. Keep hidden tests, answer keys, private rubrics, and protected generation/evaluation configuration out of student-facing responses.
15. Do not execute user-submitted code in the API process or on a privileged host.

---

## 10. File upload and storage contract

Use Supabase Storage or another approved private object store for syllabus files and other uploads. Prefer direct-to-storage signed uploads for large files if supported by the implementation; otherwise use a carefully bounded backend upload route.

Every upload workflow should define:

- Allowed file types and maximum size.
- Authenticated owner and permitted course scope.
- Private/public storage policy.
- Upload completion verification.
- Processing status and failure behavior.
- Retention/deletion policy.

The API must not accept arbitrary storage paths from clients. Generate storage paths server-side or validate them against the authenticated owner and resource scope.

---

## 11. Rate limits and operational behavior

Use configurable rate limits, with stricter limits for expensive operations. Initial values should be chosen from measured usage rather than treated as fixed product requirements. Return `429 Too Many Requests` with a `Retry-After` header when possible.

Set explicit timeouts for database and external provider requests. Retry only transient failures and only when the operation is safe to retry. Use bounded retries with backoff and jitter. Do not automatically retry a non-idempotent action unless idempotency is enforced.

Suggested observability fields:

- `requestId`
- route and HTTP method
- response status and latency
- authenticated actor ID (internal logs only; avoid unnecessary personal identifiers)
- job ID for asynchronous work
- upstream provider name and duration, without secrets or raw sensitive payloads

Never expose internal health checks or detailed dependency errors to unauthenticated clients.

---

## 12. API implementation structure

Suggested Express module layout; adapt to the existing repository rather than creating duplicate architecture:

```text
src/
  app.js
  server.js
  config/
  middleware/
    authenticate.js
    authorize.js
    validate.js
    error-handler.js
    request-id.js
    rate-limit.js
  modules/
    users/
      users.routes.js
      users.controller.js
      users.service.js
      users.schemas.js
    courses/
    syllabus/
    concepts/
    content-generation/
    questions/
    assessments/
    attempts/
    mastery/
    recommendations/
    coding/
    integrity/
    viva/
    analytics/
  integrations/
    supabase/
    ai-provider/
    code-execution/
  shared/
    errors/
    pagination/
    types/
```

Responsibilities:

- **Routes:** HTTP method/path and middleware composition.
- **Controllers:** Translate HTTP requests into service calls and format responses.
- **Schemas:** Runtime validation and request/response contract types.
- **Services:** Business rules, authorization context, and orchestration.
- **Repositories/data access:** Database operations and query boundaries.
- **Integrations:** External provider clients, with timeouts and safe error mapping.
- **Middleware:** Authentication, authorization, validation, request IDs, rate limits, and centralized error handling.

Do not put database business logic, AI provider calls, or execution orchestration directly inside route handlers. Do not duplicate authorization checks solely in frontend code.

---

## 13. Testing requirements

Every implemented endpoint must include tests appropriate to its risk and behavior:

- Happy-path valid request.
- Missing/invalid authentication.
- Wrong role and wrong resource ownership.
- Invalid body, path parameter, query, enum, and unknown protected fields.
- Not-found and conflict cases.
- Database constraints and relevant state transitions.
- Pagination and empty results for collection endpoints.
- Duplicate/retried request behavior for idempotent operations.
- No leakage of answer keys, hidden tests, private rubrics, secrets, or other users' data.
- External provider timeout/failure behavior for integrated workflows.
- RLS verification using realistic user identities/roles where feasible.

For assessment and coding flows, test deadline enforcement, repeated submissions, attempt ownership, safe result release, hidden-test protection, and execution timeout/resource limits. For adaptive learning, test that mastery is derived by the backend from trusted evidence and cannot be directly overwritten by the client.

---

## 14. Definition of done for an endpoint

An endpoint is complete only when:

- [ ] Its purpose, auth requirements, request schema, response schema, and errors are documented.
- [ ] Runtime validation is implemented.
- [ ] Authentication and resource-level authorization are enforced.
- [ ] Database/RLS rules are compatible with the operation.
- [ ] Sensitive fields are excluded from responses and logs.
- [ ] Status codes and response envelopes match this specification.
- [ ] State transitions and retries are safe.
- [ ] Unit/integration tests cover positive, negative, and security cases.
- [ ] OpenAPI or equivalent machine-readable documentation is updated if used.
- [ ] This file is updated if the approved contract changes.

---

## 15. OpenAPI and change management

When the API stabilizes, maintain an OpenAPI 3.x document generated from or validated against the runtime schemas. The OpenAPI document and runtime validation schemas must not drift apart.

For every proposed contract change, record:

1. Why the change is needed.
2. Which endpoints and consumers are affected.
3. Whether the change is backward-compatible.
4. Migration or rollout requirements.
5. Tests and documentation to update.

Prefer additive, backward-compatible changes within a major version. Breaking changes require an explicit versioning and migration plan. Do not rename or remove request/response fields silently.

---

## 16. Relationship to other project documents

Use these documents together:

- `PRD.md` — product requirements, user journeys, and acceptance criteria.
- `ARCHITECTURE.md` — system components, responsibilities, and communication patterns.
- `DATABASE.md` — authoritative data model, constraints, relationships, RLS, and migrations.
- `AGENT.md` — workflow and rules for AI agents and developers.
- `API_SPEC.md` — endpoint contracts, JSON shapes, status codes, auth, and error behavior.

If documents conflict, do not guess. Treat `DATABASE.md` as authoritative for the database schema and `PRD.md` as authoritative for product requirements. Raise unresolved API/architecture conflicts for approval before implementation. The actual repository and deployed provider capabilities must also be inspected before claiming an endpoint or integration exists.

---

## 17. Implementation checklist

- [ ] Confirm the actual repository structure, runtime, base path, and existing endpoints.
- [ ] Confirm Supabase Auth token verification and user/role mapping.
- [ ] Confirm schema names and relationships against `DATABASE.md` and migrations.
- [ ] Implement shared response/error handling and request IDs.
- [ ] Implement runtime validation and centralized authorization.
- [ ] Add pagination and safe filtering utilities.
- [ ] Implement one approved module at a time, beginning with health/session and core course access.
- [ ] Add tests before expanding to assessment, mastery, coding, and integrity-sensitive modules.
- [ ] Validate RLS and response-field redaction.
- [ ] Document any deviation and update this specification after approval.
