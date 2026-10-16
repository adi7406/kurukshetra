# AI_IMPLEMENTATION.md
## AI Implementation Specification — Adaptive Learning and Assessment Portal

**Document status:** Implementation guide  
**Audience:** AI coding agents, backend developers, frontend developers, and reviewers  
**Purpose:** Define how AI-powered capabilities should be implemented safely, consistently, and incrementally.

> This document describes the intended implementation contract. It does not claim that providers, endpoints, jobs, or models are already configured. Before coding, inspect the repository, existing migrations, and installed dependencies; reconcile differences with `PRD.md`, `AGENT.md`, `Architecture.md`, `DATABASE.md`, `API_SPEC.md`, and `ENVIRONMENT.md`.

---

## 1. Core Principles

1. **AI assists; application logic remains authoritative.** Use deterministic code for permissions, scoring rules, state transitions, validation, and assessment timing.
2. **Ground generated content in source material.** When content is derived from uploaded syllabi or course resources, retain source references and show evidence where feasible.
3. **Validate every model output.** Parse structured responses against runtime schemas; reject or repair invalid output with bounded retries.
4. **Keep secrets server-side.** Provider keys and privileged database credentials must never be sent to the browser.
5. **Use asynchronous jobs for long-running work.** Document parsing, content generation, embeddings, and batch processing must not block ordinary HTTP requests.
6. **Separate generation from publication.** AI-generated learning content and questions should remain drafts until validation and any required trainer review are complete.
7. **Make AI decisions explainable.** Store model/version metadata, inputs or safe references, outputs, validation status, and relevant evidence without retaining unnecessary sensitive data.
8. **Fail safely.** If an AI provider is unavailable or returns unreliable output, return a clear status and allow retry; do not fabricate success.
9. **Protect assessment integrity.** Never expose answer keys, hidden coding tests, grading rubrics that must remain private, or privileged prompts to unauthorized clients.
10. **Measure before optimizing.** Track quality, latency, failure rate, token usage, and cost using privacy-conscious telemetry.

---

## 2. AI Capabilities and Ownership

| Capability | AI responsibility | Deterministic/application responsibility |
|---|---|---|
| Syllabus processing | Extract topics, learning objectives, and candidate relationships from document text | File validation, parsing pipeline, schema validation, duplicate checks, prerequisite cycle checks, approval |
| Learning material generation | Draft explanations, examples, summaries, and practice material | Source access control, output validation, publication workflow, versioning |
| Question generation | Draft questions, options, explanations, tags, and difficulty estimates | Uniqueness checks, answer validation, scoring, versioning, trainer approval |
| Concept graph assistance | Suggest concepts and prerequisite links | Persist graph, detect cycles, enforce graph rules, authorize changes |
| Mastery estimation | Optional classification or evidence interpretation | Compute mastery using the configured model, maintain history, validate evidence and timestamps |
| Recommendations | Optional ranking or explanation of candidate activities | Enforce prerequisites, availability, learner access, safety constraints, and fallback ranking |
| AI viva | Ask follow-up questions and assess responses against a rubric | Session rules, evidence capture, rubric versioning, deterministic score bounds, review and appeals |
| Integrity signals | Identify potentially relevant patterns for review | Never automatically conclude misconduct; preserve evidence, apply policy, route to human review |

Do not add an AI model to a task that is simpler, more reliable, and cheaper as ordinary application logic.

---

## 3. Recommended Integration Boundary

Implement a provider-independent AI layer behind backend services. Business modules must not call a vendor SDK directly.

```text
Frontend
   |
   v
Authenticated API / Express routes
   |
   v
Domain services
   |-- Syllabus service
   |-- Content and question service
   |-- Mastery and recommendation service
   |-- Viva and integrity review service
   |
   v
AI orchestration layer
   |-- Provider adapter
   |-- Prompt/template registry
   |-- Input and output schemas
   |-- Retry / timeout / rate-limit policy
   |-- Redaction and safety checks
   |-- Usage and quality telemetry
   |
   +--> Configured AI provider(s)
   |
   +--> Job queue / worker
   |
   +--> Supabase PostgreSQL and private object storage
```

### 3.1 Suggested module layout

Adapt to the actual repository rather than creating duplicate folders.

```text
backend/src/
  modules/
    ai/
      ai.types.ts
      ai.provider.ts
      ai.service.ts
      ai.errors.ts
      ai.schemas.ts
      prompt-registry.ts
      usage.service.ts
    syllabus/
      syllabus.service.ts
      syllabus.jobs.ts
    content/
      content-generation.service.ts
    questions/
      question-generation.service.ts
    mastery/
      mastery.service.ts
      mastery-model.ts
    recommendations/
      recommendation.service.ts
    viva/
      viva.service.ts
    integrity/
      integrity-review.service.ts
  workers/
    ai-generation.worker.ts
```

Names and structure are suggestions. Follow existing conventions in the repository.

### 3.2 Provider adapter contract

Create an internal interface so provider changes do not require rewriting domain logic.

```ts
export interface StructuredGenerationRequest<TInput> {
  task: string;
  input: TInput;
  systemPrompt: string;
  userPrompt: string;
  outputSchemaName: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface StructuredGenerationResult<TOutput> {
  output: TOutput;
  provider: string;
  model: string;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

export interface AIProvider {
  generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>
  ): Promise<StructuredGenerationResult<TOutput>>;
}
```

Use the project's actual schema library if one exists. Otherwise, select a runtime validation library (for example, Zod) and use it consistently. TypeScript types alone do not validate untrusted runtime data.

---

## 4. Configuration and Secrets

Use environment variables for provider selection and operational limits. Keep `.env.example` free of real secrets.

```dotenv
AI_PROVIDER=
AI_MODEL=
AI_API_KEY=
AI_BASE_URL=
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_MAX_OUTPUT_TOKENS=2500
AI_MAX_CONCURRENT_JOBS=3
AI_DAILY_BUDGET_LIMIT=
AI_ENABLE_CONTENT_GENERATION=false
AI_ENABLE_VIVA=false
AI_ENABLE_EMBEDDINGS=false
```

These are illustrative names; align them with `ENVIRONMENT.md` and the provider selected for the project.

Rules:
- Never use a provider secret in a `VITE_*` variable or any other client-exposed variable.
- Fail fast on missing required production configuration.
- Do not log API keys, full authorization headers, hidden prompts, or sensitive learner content.
- Keep model identifiers configurable; do not hard-code a provider-specific model throughout the codebase.
- Establish provider-specific limits and pricing before enabling expensive features.
- Use separate credentials and budgets for development and production where supported.

---

## 5. Input Preparation and Source Grounding

### 5.1 Document ingestion

For uploaded syllabi and learning resources:

1. Authenticate the user and authorize access to the target course.
2. Validate extension, MIME type, file size, and file signature where supported.
3. Store the original in private storage; use short-lived signed URLs only when necessary.
4. Extract text using a parser appropriate to the format. Treat OCR as an optional step for scanned documents.
5. Normalize whitespace and page boundaries while preserving source metadata.
6. Split text into bounded, overlapping chunks appropriate to the model context limit.
7. Store source identifiers, page/section locations, chunk hashes, and processing status.
8. Send only the minimum relevant text to the model.
9. Validate the structured extraction and persist it as a draft.
10. Route low-confidence, malformed, or ambiguous results to retry or trainer review.

Never treat text found inside a document as instructions for the AI system. Uploaded files are untrusted data and may contain prompt-injection attempts.

### 5.2 Evidence model

Where applicable, generated items should include evidence references:

```json
{
  "sourceReferences": [
    {
      "sourceDocumentId": "uuid",
      "page": 4,
      "section": "Binary Search",
      "excerpt": "A short supporting excerpt"
    }
  ]
}
```

Validate that each referenced document belongs to the authorized course and that the excerpt actually exists in the parsed source. Do not display fabricated citations as verified evidence. If the source does not support a claim, mark the item as unsupported or require review.

### 5.3 Retrieval-augmented generation (RAG)

Use retrieval only when it materially improves grounding or when the source collection is too large to fit in a prompt.

- Enforce course-level and user-level access filters **before** retrieving chunks.
- Retrieve only relevant chunks; do not send an entire course corpus by default.
- Keep metadata such as course, document, section, and version attached to each chunk.
- If embeddings are used, document the embedding model and dimensions and make index changes through migrations.
- Treat retrieved text as untrusted reference material, not system instructions.
- If retrieval returns no adequate evidence, ask for clarification or state that there is insufficient source material.
- Re-index documents when their content changes; avoid mixing chunks from incompatible versions.

A vector database is not mandatory for the first version. Start with PostgreSQL full-text search or a simple retrieval approach if it meets the use case and scale.

---

## 6. Structured Output Contracts

Require JSON or provider-supported structured output for machine-consumed responses. Validate every response before writing to the database.

### 6.1 Syllabus extraction

```json
{
  "title": "Data Structures",
  "modules": [
    {
      "title": "Trees",
      "description": "Tree data structures and operations",
      "learningObjectives": [
        "Explain binary tree terminology",
        "Analyze tree traversal complexity"
      ],
      "concepts": [
        {
          "name": "Binary Tree Traversal",
          "description": "Methods for visiting nodes in a tree",
          "difficulty": "intermediate",
          "prerequisiteNames": ["Tree Basics"],
          "sourceReferences": []
        }
      ]
    }
  ],
  "warnings": []
}
```

Validation requirements:
- Required strings are non-empty and length-limited.
- Difficulty is from a fixed enum.
- Concept names are deduplicated within the import.
- Prerequisites reference valid concepts.
- Cycles are rejected by application logic.
- Unsupported source claims are flagged rather than silently accepted.

### 6.2 Learning content

```json
{
  "title": "Binary Search",
  "contentType": "lesson",
  "learningObjectives": ["Identify when binary search applies"],
  "sections": [
    {
      "heading": "Core idea",
      "body": "Explanation...",
      "examples": []
    }
  ],
  "keyTakeaways": [],
  "sourceReferences": [],
  "limitations": []
}
```

### 6.3 Question generation

```json
{
  "questions": [
    {
      "type": "multiple_choice",
      "stem": "Which condition is required for standard binary search?",
      "options": [
        {"id": "A", "text": "The data is sorted"},
        {"id": "B", "text": "The data contains only positive values"}
      ],
      "correctOptionIds": ["A"],
      "explanation": "Binary search repeatedly halves the search interval.",
      "difficulty": "beginner",
      "conceptNames": ["Binary Search"],
      "sourceReferences": []
    }
  ]
}
```

Important:
- The correct answer and hidden rubric must be stored separately from learner-visible question data.
- Validate that option IDs are unique and that correct option IDs exist.
- Validate question type, answer cardinality, explanation length, and concept references.
- Detect near-duplicates against the question bank where feasible.
- Do not publish generated questions until they pass validation and any required trainer approval.

### 6.4 Validation and repair

Use this bounded flow:

1. Request structured output.
2. Parse and validate it.
3. If invalid, make at most the configured number of repair attempts, passing validation errors without unnecessary sensitive data.
4. If still invalid, mark the job `failed_validation` and preserve a safe diagnostic.
5. Do not save invalid output as published content.

Do not retry permanent errors (invalid credentials, unsupported model, malformed configuration) as if they were transient failures.

---

## 7. Prompt Management

Store prompts as versioned templates in code or a controlled prompt registry. Do not scatter large prompt strings across route handlers.

Each template should document:
- Template identifier and version
- Task and intended output schema
- Allowed inputs and source boundaries
- Explicit constraints and prohibited behavior
- Expected failure behavior
- Evaluation cases
- Owner or change rationale

Prompt design rules:
- Separate trusted system instructions from user-supplied content.
- Clearly delimit uploaded text, learner answers, and retrieved passages as untrusted data.
- Do not include secrets or unnecessary personal information.
- Require uncertainty or missing evidence to be stated, not guessed.
- Do not instruct the model to determine guilt, make irreversible decisions, or override authorization.
- Version prompts so output changes can be traced and evaluated.

---

## 8. Background Jobs and State Management

Use a durable queue or the project's established job mechanism for long-running tasks. Do not introduce a queue product without checking the current architecture and deployment constraints.

Suggested job states:

`queued -> processing -> validating -> awaiting_review -> completed`

Failure states may include `failed`, `failed_validation`, `cancelled`, and `retry_scheduled`.

Every job should have:
- Unique ID and idempotency key
- Requesting user and authorized course/resource scope
- Task type and input references
- Prompt version and model/provider metadata
- Attempt count and timestamps
- Progress/status information safe to expose
- Output reference, not a public copy of secrets or protected content
- Error category and safe diagnostic
- Usage/cost metadata when available

Requirements:
- Make job creation idempotent when duplicate requests are possible.
- Use bounded retries with exponential backoff and jitter for transient errors.
- Enforce concurrency and rate limits.
- Support cancellation where safe.
- Prevent duplicate database writes when a worker retries.
- Do not expose stack traces or raw provider errors to clients.
- Clean up abandoned jobs and define a retention policy for inputs and outputs.

---

## 9. Adaptive Mastery and Recommendations

### 9.1 Mastery estimation

The initial mastery engine should be deterministic and testable. Do not ask a general-purpose language model to invent mastery percentages.

Use the configured method from the product design—such as Bayesian Knowledge Tracing (BKT)—with explicit parameters and versioning.

Inputs may include:
- Concept and learner identifiers
- Question/concept mapping
- Correctness and score
- Attempt timestamp
- Question difficulty and evidence quality, if supported by the model
- Relevant attempt metadata

Implementation rules:
1. Validate that the learner owns the attempt and that the attempt is finalized.
2. Use only valid, authorized evidence.
3. Apply the configured model and parameter version.
4. Persist the new state and an append-only history record in one transaction where possible.
5. Make repeated processing of the same evidence idempotent.
6. Keep the evidence and calculation method traceable.
7. Avoid presenting estimates as objective certainty; show meaningful explanations and limitations.

Do not use protected attributes or unrelated personal information in mastery estimates. A low-confidence estimate should trigger more learning evidence, not a punitive conclusion.

### 9.2 Recommendation engine

Start with rule-based candidate filtering and ranking. An AI model may explain a recommendation, but should not bypass eligibility rules.

Suggested candidate flow:
1. Select concepts or activities relevant to the learner's enrolled course.
2. Exclude unavailable, unpublished, or unauthorized resources.
3. Enforce prerequisite and curriculum constraints.
4. Rank by mastery gap, prerequisite readiness, recency, learner goal, and configured policy.
5. Return a short reason and supporting evidence for each recommendation.
6. Fall back to a safe deterministic ranking if the AI provider fails.

Recommendations should be auditable and should not trap a learner in a repetitive loop. Provide a way to continue, review prerequisites, or request another activity.

---

## 10. AI Viva Implementation

AI viva should be a guided assessment assistant, not an unconstrained chatbot.

- Start from a published question set or configured learning objectives.
- Generate follow-up questions within the allowed topic and difficulty boundaries.
- Track question sequence, timestamps, and the relevant learner response.
- Use a versioned rubric with explicit criteria.
- Return criterion-level feedback supported by answer evidence.
- Validate score bounds and required fields in application code.
- Clearly label AI-generated feedback and any provisional score.
- Permit trainer review and correction where the product requires it.
- Prevent the model from accessing hidden test answers, unrelated student records, or other learners' sessions.
- Stop or recover gracefully when provider calls time out.
- Do not make high-impact academic decisions solely from an unreviewed model output.

Suggested response contract:

```json
{
  "feedback": "Your answer correctly explains the main idea...",
  "criteria": [
    {
      "criterionId": "conceptual_accuracy",
      "score": 3,
      "maxScore": 4,
      "evidence": "The response identifies the search interval reduction."
    }
  ],
  "followUpQuestion": "What changes if the input is not sorted?",
  "confidence": "medium",
  "requiresReview": true
}
```

Treat the `confidence` field as a qualitative model estimate, not a calibrated probability unless calibration has been tested.

---

## 11. Integrity Signals and Fairness

Integrity-related AI must be conservative and evidence-based.

- Detect or summarize observable signals only within the documented product policy.
- Store event timestamps, relevant session context, detection method/version, and uncertainty.
- Do not infer intent or declare cheating from a single signal.
- Do not use facial recognition, emotion inference, or sensitive personal attributes unless separately approved through a documented legal, privacy, and product review.
- Do not automatically fail, suspend, or penalize a learner based solely on model output.
- Provide human review, an audit trail, and an appeal/correction path where applicable.
- Minimize retained data and restrict access to authorized reviewers.
- Test false positives, accessibility impacts, and performance across realistic usage conditions.

Integrity signals should be treated as **review leads**, not proof of misconduct.

---

## 12. Security and Privacy Controls

1. Authenticate and authorize every AI-related request before retrieving data or starting a job.
2. Apply course, enrollment, role, and ownership filters before data enters a prompt.
3. Use private storage and short-lived access URLs.
4. Redact unnecessary personal identifiers from prompts and logs.
5. Do not send answer keys, hidden test cases, or unrelated learner data to models.
6. Treat user messages, uploaded documents, code, and retrieved chunks as untrusted input.
7. Enforce input length, output size, timeout, concurrency, and spend limits.
8. Validate URLs and external references to prevent server-side request forgery if tools or browsing are introduced.
9. Do not allow generated SQL, shell commands, or code to execute with application privileges.
10. Keep audit logs for privileged actions, review decisions, prompt/model versions, and content publication.
11. Configure retention and deletion for source files, extracted text, prompts, outputs, and provider logs.
12. Verify provider data-retention and training policies before sending production learner data.

### Student code

If AI feedback is added to coding tasks:
- Send only the code and test summary required for the feedback task.
- Remove secrets and unnecessary metadata.
- Run code exclusively in an isolated execution service with strict CPU, memory, network, process, and time limits.
- Never execute student code in the Express process or in the same privileged environment as the database.
- Keep hidden tests and expected outputs server-side.
- Do not treat AI-generated code review as the authoritative test result.

---

## 13. Errors, Retries, and Fallbacks

Use stable internal error categories, for example:

| Category | Example | Expected behavior |
|---|---|---|
| `AI_NOT_CONFIGURED` | Missing provider credentials | Fail fast in production; provide safe setup diagnostic |
| `AI_RATE_LIMITED` | Provider rate limit | Retry with backoff within limits; otherwise report retryable status |
| `AI_TIMEOUT` | Provider exceeded timeout | Cancel if possible; preserve job state and allow safe retry |
| `AI_PROVIDER_ERROR` | Provider unavailable | Retry transient failures only |
| `AI_INVALID_OUTPUT` | Malformed structured response | Bounded repair attempts, then fail validation |
| `AI_POLICY_BLOCKED` | Provider refuses request | Return a safe explanation; do not retry indefinitely |
| `AI_BUDGET_EXCEEDED` | Configured cost limit reached | Stop generation and inform authorized user |
| `AI_SOURCE_INSUFFICIENT` | No supporting source found | Request more material or state the limitation |

Never expose raw provider payloads, prompts, API keys, stack traces, or hidden reasoning to the client. Return actionable but safe messages.

---

## 14. Observability and Cost Controls

Record, where supported:
- Task type, provider, model, and prompt version
- Request/job ID and latency
- Success/failure category and validation outcome
- Input/output token counts or equivalent usage
- Retry count and rate-limit events
- Estimated cost, subject to provider pricing availability
- Human review outcome and sampled quality rating

Do not log full learner answers or uploaded documents by default. Use redacted metadata and configurable retention.

Set:
- Per-user and per-course rate limits
- Maximum input and output lengths
- Provider timeouts and concurrency
- Daily or monthly budget alerts
- Circuit breakers for sustained provider failures
- Alerts for unexpected cost or failure spikes

---

## 15. Evaluation and Testing

Create a versioned evaluation dataset with representative, privacy-safe examples. Include edge cases and negative cases.

### Minimum evaluation suites

**Syllabus extraction**
- Correct topic and objective extraction
- Duplicate concepts
- Missing or ambiguous prerequisites
- Cyclic prerequisite suggestions
- Scanned/empty/unreadable documents
- Prompt injection embedded in source files
- Unsupported claims and incorrect citations

**Content and questions**
- Factual correctness against source
- Clear, age/level-appropriate explanations
- Answer key consistency
- Distractor quality and uniqueness
- Duplicate/near-duplicate detection
- Invalid schema, missing fields, oversized output
- Questions that accidentally reveal answers in learner-visible content

**Mastery and recommendations**
- Unit tests for configured model equations and boundary conditions
- Reprocessing the same evidence
- Missing or conflicting evidence
- Prerequisite enforcement
- No eligible recommendations
- Deterministic fallback during AI outage

**Viva and integrity**
- Rubric adherence and score bounds
- Unsupported feedback claims
- Inconsistent answers across repeated runs
- False positives and uncertainty handling
- Review and correction workflow
- Access-control and data-isolation tests

Use automated schema checks and deterministic tests in CI. Human review remains necessary for pedagogical quality and high-impact outputs. Do not rely on a single aggregate quality score.

---

## 16. Development and Rollout Plan

### Phase 1 — Foundation
- Inspect repository and existing architecture.
- Define the provider adapter, schemas, configuration validation, error types, and telemetry.
- Add unit tests and a mock provider for local development.
- Keep AI features disabled until configuration is complete.

### Phase 2 — Syllabus ingestion
- Implement secure upload and text extraction.
- Add chunking, structured extraction, source references, validation, and draft review.
- Test malformed files, prompt injection, and access control.

### Phase 3 — Content and question generation
- Add versioned prompts and structured output schemas.
- Validate generated content and answer keys.
- Add trainer review and publication controls.
- Keep protected fields out of learner responses.

### Phase 4 — Adaptive learning
- Implement and test the configured mastery model in ordinary application code.
- Add evidence history and idempotent updates.
- Add rule-based recommendation filtering and ranking.
- Introduce AI explanations only after the deterministic flow is stable.

### Phase 5 — Viva and integrity review
- Implement bounded viva sessions and rubric-based feedback.
- Add evidence-based integrity review with human oversight.
- Conduct privacy, fairness, and false-positive reviews before release.

### Phase 6 — Controlled production rollout
- Use feature flags and restricted cohorts.
- Monitor quality, cost, latency, failure rates, and user feedback.
- Compare outputs against a baseline before changing prompts or models.
- Maintain rollback capability for prompts, model settings, and feature flags.

---

## 17. Definition of Done

An AI feature is complete only when:

- [ ] Its owner, inputs, outputs, and failure behavior are documented.
- [ ] Access control is applied before data retrieval and prompt construction.
- [ ] Runtime schemas validate all model output.
- [ ] Prompt and model versions are traceable.
- [ ] Timeouts, bounded retries, rate limits, and budget controls are configured.
- [ ] Secrets and protected assessment data remain server-side.
- [ ] Long-running work uses a durable job pattern where appropriate.
- [ ] Failures produce safe, actionable status responses.
- [ ] Unit, integration, security, and evaluation tests pass.
- [ ] Logs avoid unnecessary personal or sensitive content.
- [ ] Human review is available for content publication and high-impact decisions.
- [ ] Documentation and environment examples are updated.
- [ ] Feature flags and rollback procedures are verified.

---

## 18. Instructions for AI Coding Agents

Before implementing an AI capability:

1. Read `AGENT.md` and the project documentation.
2. Inspect the actual repository, package scripts, dependencies, migrations, and existing provider integrations.
3. Identify whether the task requires an LLM, deterministic logic, retrieval, or a background job.
4. Propose the smallest implementation that satisfies the requirement.
5. Define the input/output schema, authorization boundary, error states, and tests before writing the service.
6. Reuse the shared AI adapter and validation patterns; do not add direct provider calls to route handlers.
7. Do not invent environment variables, database tables, API endpoints, or provider capabilities without documenting and implementing them.
8. Never weaken RLS, expose service-role credentials, reveal answer keys, or execute code in a privileged application process to make a demo work.
9. Update the relevant tests and documentation with every behavior change.
10. Report what was implemented, what was tested, required configuration, and any limitations.

If this document conflicts with the current implementation or another project specification, stop and report the conflict. Do not silently change database schema, product scope, or security policy.
