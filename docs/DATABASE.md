# Database Design — Adaptive Learning and Assessment Portal

**Version:** 1.0  
**Database:** Supabase PostgreSQL  
**Related document:** `PRD.md`  
**Status:** Proposed implementation specification

## 1. Purpose

This document defines the relational data model and database rules for the Adaptive Learning and Assessment Portal. It covers users, courses, versioned syllabi, concepts and prerequisites, theory resources, AI-generated content, question banks, test series, attempts, mastery estimation, recommendations, coding sessions, sandbox execution, replayable editor events, integrity review, and code-specific viva.

PostgreSQL is sufficient for the concept graph in the MVP; a separate graph database is not required.

## 2. Core design principles

1. PostgreSQL is the source of truth; AI providers and execution services are external processors.
2. Use UUID primary keys and `timestamptz` timestamps stored in UTC.
3. Use foreign keys, check constraints, unique constraints, and migrations.
4. Version published syllabi, questions, and assessments so historical results remain interpretable.
5. AI-generated content remains a draft until validated and approved where required.
6. Keep answer keys, hidden test cases, expected outputs, and provider secrets inaccessible to students.
7. Enforce authorization in both the API and Supabase Row Level Security (RLS).
8. Mastery estimates and integrity signals are separate; an integrity signal must not automatically lower mastery or punish a student.
9. Store coding events with stable sequence numbers and timestamps for replay.
10. Collect only data required for learning and assessment, and define retention periods.

## 3. Entity relationship overview

```text
auth.users -> profiles
courses -> course_versions -> modules -> concepts
concepts -> concept_objectives
concepts <-> concept_prerequisites <-> concepts
concepts <-> question_concepts <-> question_versions
concepts -> learning_resources
courses -> enrollments -> profiles
assessments -> assessment_questions -> question_versions
assessments -> assessment_attempts -> student_answers
profiles + concepts -> student_mastery -> mastery_history
profiles -> recommendations
coding_sessions -> session_events
coding_sessions -> submissions -> execution_jobs
submissions -> test_results
coding_sessions -> integrity_signals -> integrity_signal_evidence -> session_events
integrity_signals -> integrity_reviews
submissions -> viva_questions -> viva_answers
source_documents -> content_generation_jobs -> generated_content
```

## 4. Identity, courses, and enrollment

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users(id)` |
| `display_name` | text | Optional |
| `role` | text | `student`, `trainer`, `admin`; default `student` |
| `created_at`, `updated_at` | timestamptz | Required |

Users must not be able to grant themselves trainer/admin roles. Role changes must use a trusted server-side operation and be audited.

### `courses`

`id UUID PK`, `title text NOT NULL`, `description text`, `created_by UUID FK profiles`, `status text` (`draft`, `published`, `archived`), timestamps.

### `course_versions`

`id UUID PK`, `course_id UUID FK courses`, `version_number integer`, `status` (`draft`, `in_review`, `published`, `archived`), `learning_audience text`, `learning_goals jsonb`, optional positive `duration_minutes`, `created_by UUID FK profiles`, optional `approved_by UUID FK profiles`, `published_at`, `created_at`. Unique `(course_id, version_number)`. Published versions should not be edited in place.

### `enrollments`

`id UUID PK`, `course_id UUID FK courses`, `student_id UUID FK profiles`, `status` (`active`, `completed`, `withdrawn`), `enrolled_at`, `completed_at`. Unique `(course_id, student_id)`.

### `course_trainers` (recommended for multi-trainer courses)

`course_id UUID FK courses`, `trainer_id UUID FK profiles`, `permission_level` (`owner`, `editor`, `reviewer`), `created_at`; primary key `(course_id, trainer_id)`.

## 5. Syllabus, concept graph, and resources

### `modules`

`id UUID PK`, `course_version_id UUID FK course_versions`, `title`, optional `description`, non-negative `order_index`, `created_at`. Unique `(course_version_id, order_index)`.

### `concepts`

`id UUID PK`, `module_id UUID FK modules`, `name`, optional `description`, non-negative `order_index`, `status` (`draft`, `published`, `archived`), timestamps. Use a stable slug if needed. Concept IDs must have a documented relationship to course versions; mastery must not silently transfer between unrelated versions.

### `concept_objectives`

`id UUID PK`, `concept_id UUID FK concepts`, `objective_text`, non-negative `order_index`, `created_at`. Example objectives: explain inheritance, implement a subclass, distinguish overriding from overloading.

### `concept_prerequisites`

`concept_id UUID FK concepts`, `prerequisite_concept_id UUID FK concepts`, optional `created_by UUID FK profiles`, `created_at`; primary key `(concept_id, prerequisite_concept_id)`. Require `concept_id <> prerequisite_concept_id` and validate that both concepts belong to a compatible course/version scope. Cycles must be rejected by application validation or a database trigger/service; a simple row-level `CHECK` cannot detect arbitrary graph cycles. Do not assume syllabus order proves a prerequisite.

### `source_documents`

`id UUID PK`, `course_id UUID FK courses`, `uploaded_by UUID FK profiles`, private `storage_path`, `original_filename`, `mime_type`, positive `file_size_bytes`, optional `checksum_sha256`, `extraction_status` (`queued`, `processing`, `succeeded`, `failed`, `needs_review`), optional `extracted_text`, `extraction_metadata jsonb`, `created_at`.

Use private storage, upload size/type limits, safe filename handling, and OCR only when needed for scanned PDFs. Do not accept arbitrary executable files as syllabus documents.

### `learning_resources`

`id UUID PK`, `concept_id UUID FK concepts` (or use a join table if resources span concepts), `title`, `resource_type` (`article`, `notes`, `video`, `link`, `example`, `document`, `interactive`), optional `content`, optional `url`, optional `source_document_id UUID FK source_documents`, optional difficulty, `source_type` (`trainer`, `imported`, `ai_generated`), `review_status` (`draft`, `in_review`, `approved`, `rejected`, `archived`), `version_number`, `created_by`, optional `approved_by`, timestamps.

## 6. AI generation and review

### `content_generation_jobs`

`id UUID PK`, optional `course_id FK courses`, `requested_by UUID FK profiles`, `job_type`, `status` (`queued`, `processing`, `succeeded`, `failed`, `cancelled`), `input_payload jsonb`, optional provider/model/prompt version, `result_metadata jsonb`, safe error code/message, timestamps. Do not store provider keys or unnecessary student data in payloads.

### `generated_content`

`id UUID PK`, `job_id UUID FK content_generation_jobs`, `content_type` (`syllabus`, `theory`, `question_draft`, `explanation`, `rubric`), optional title, `content_json jsonb`, `source_references jsonb`, `review_status` (`draft`, `in_review`, `approved`, `rejected`), optional reviewer/time, `created_at`. Validate generated JSON against a versioned schema before using it.

## 7. Question bank and assessments

### `questions` and `question_versions`

`questions` is the stable identity; `question_versions` preserves each immutable version. Question versions should include `id UUID PK`, `question_id UUID FK questions`, positive `version_number`, `prompt`, optional instructions, difficulty, marks, metadata JSONB, review status, creator and timestamp. Unique `(question_id, version_number)`.

Supported types: `mcq_single`, `mcq_multiple`, `short_answer`, `theory`, `output_prediction`, `debugging`, `code_completion`, `coding`, `explanation`.

### `question_concepts`

Many-to-many mapping: `question_version_id UUID FK question_versions`, `concept_id UUID FK concepts`, optional weight; primary key `(question_version_id, concept_id)`. Only mapped concepts should normally receive mastery evidence from a question.

### `question_options`

`id UUID PK`, `question_version_id UUID FK question_versions`, `option_key`, `option_text`, `order_index`; unique `(question_version_id, option_key)` and `(question_version_id, order_index)`. Do not expose answer correctness through student-readable APIs.

### `question_answers` (protected)

`id UUID PK`, `question_version_id UUID FK question_versions UNIQUE`, `answer_type`, `answer_payload jsonb`, `evaluation_config jsonb`, `created_at`. Inaccessible to student roles; accessed only by trusted evaluation logic.

### `question_rubrics`

`id UUID PK`, `question_version_id UUID FK question_versions`, `rubric_json jsonb`, `max_score`, `created_at`. Use criteria-based rubrics for theory and viva answers.

### `coding_test_cases` (protected)

`id UUID PK`, `question_version_id UUID FK question_versions`, `input_payload`, optional `expected_output`, `is_hidden boolean default true`, `weight`, `time_limit_ms`, `memory_limit_mb`, `order_index`, `created_at`. Student APIs must never return hidden input, expected output, reference solutions, or private evaluator configuration.

### `assessments`

`id UUID PK`, `course_version_id UUID FK course_versions`, `title`, description, `assessment_type` (`practice`, `adaptive_practice`, `fixed_test`, `test_series`), `status` (`draft`, `in_review`, `published`, `archived`), optional time limit and max attempts, negative-marking flag, `settings jsonb`, creator/publisher IDs, timestamps.

### `assessment_questions`

`assessment_id UUID FK assessments`, `question_version_id UUID FK question_versions`, `position`, optional marks override and section name; primary key `(assessment_id, position)`, unique `(assessment_id, question_version_id)` for fixed tests. Adaptive question selections are recorded per attempt.

### `test_series` and `test_series_items`

Use if a test series is a first-class entity. `test_series` stores course version, title, description, creator and status. `test_series_items` links series to assessments with a position; unique position within each series.

## 8. Attempts, answers, and learning evidence

### `assessment_attempts`

`id UUID PK`, `assessment_id UUID FK assessments`, `student_id UUID FK profiles`, `attempt_number`, status (`in_progress`, `submitted`, `evaluating`, `completed`, `abandoned`, `failed_infrastructure`), start/submission/completion timestamps, optional score/max score, `result_metadata jsonb`; unique `(assessment_id, student_id, attempt_number)`. An infrastructure failure must not silently count as a wrong answer.

### `student_answers`

`id UUID PK`, `attempt_id UUID FK assessment_attempts`, `question_version_id UUID FK question_versions`, `answer_payload jsonb`, optional score/max score/feedback, evaluation status (`pending`, `evaluated`, `needs_review`, `failed`), submitted/evaluated timestamps. If multiple answer revisions are allowed, model them separately rather than overwriting the original.

### `learning_attempts`

Normalized evidence record: `id UUID PK`, `student_id UUID FK profiles`, `concept_id UUID FK concepts`, optional question version and student answer references, optional correctness/score/max score/difficulty, `hints_used`, `attempt_count`, `evidence_type`, `occurred_at`, `metadata jsonb`. Use idempotent processing so the same result is not ingested twice into mastery.

## 9. Mastery and recommendation tables

### `student_mastery`

`student_id UUID FK profiles`, `concept_id UUID FK concepts`, `mastery_probability numeric(6,5)` constrained to `[0,1]`, `evidence_count >= 0`, `model_name`, `model_version`, `last_evidence_at`, `updated_at`; primary key `(student_id, concept_id)` (extend the key if mastery is scoped by course version).

### `mastery_history`

Append-only record: `id UUID PK`, student and concept FKs, optional previous probability, new probability constrained to `[0,1]`, `evidence_source_type`, optional source ID, model name/version, reason JSONB, `created_at`. Do not overwrite history when a new estimate is calculated.

### `mastery_model_configs`

`id UUID PK`, model name/version, scope JSONB, parameters JSONB, `is_active`, optional creator, timestamp. Only trusted administrators or deployment processes may activate model parameters.

### `recommendations`

`id UUID PK`, `student_id UUID FK profiles`, `course_version_id UUID FK course_versions`, optional concept/resource/question target, `activity_type` (`read`, `watch`, `quiz`, `coding`, `review`, `project`), human-readable reason, optional priority, status (`recommended`, `accepted`, `completed`, `dismissed`, `expired`), model version, timestamps. At least one target must be set. Add foreign keys to resource/question tables after those tables exist.

## 10. Coding sessions and secure execution

### `coding_sessions`

`id UUID PK`, `student_id UUID FK profiles`, optional assessment attempt FK, `question_version_id UUID FK question_versions`, status (`active`, `submitted`, `closed`, `recording_incomplete`), `recording_consent_version`, start/end timestamps, `last_event_sequence`, `event_stream_complete`, `created_at`.

### `session_events`

`id UUID PK`, `session_id UUID FK coding_sessions`, `sequence_number bigint`, `occurred_at`, `event_type`, `payload jsonb`, optional `client_event_id`, `created_at`; unique `(session_id, sequence_number)` and unique `(session_id, client_event_id)` when client IDs exist.

Event types may include `document_change`, `paste`, `run`, `submit`, `editor_focus`, `editor_blur`, `visibility_change`, `language_change`, and `snapshot`. Store editor deltas plus periodic snapshots for efficient replay. Validate event payload schemas and sizes. Do not collect unrelated clipboard or browsing content.

### `submissions`

`id UUID PK`, `student_id UUID FK profiles`, `question_version_id UUID FK question_versions`, optional attempt/session FKs, `language_id`, source code or protected source-artifact reference, optional source hash, status (`queued`, `running`, `accepted`, `wrong_answer`, `compile_error`, `runtime_error`, `time_limit`, `memory_limit`, `output_limit`, `infrastructure_error`), score/max score, timestamps. Restrict source-code access to the owner and authorized trainers.

### `execution_jobs`

`id UUID PK`, `submission_id UUID FK submissions`, provider, optional provider job ID, status, limits JSONB, result metadata JSONB, safe failure code, timestamps. Never store execution-provider credentials in this table.

### `test_results`

`id UUID PK`, `submission_id UUID FK submissions`, `test_case_id UUID FK coding_test_cases`, status, optional runtime/memory metrics, points awarded, safe diagnostic, timestamp; unique `(submission_id, test_case_id)`. Never expose hidden input/expected output in student-facing responses.

**Sandbox rule:** Never execute student code inside the main Express process. Use an isolated service such as a securely configured Judge0 deployment. Apply CPU, memory, time, process, output, filesystem, and network limits. Docker alone is not a complete security guarantee; consider hardened runtimes or microVM isolation for production.

## 11. Integrity signals and human review

### `integrity_signals`

`id UUID PK`, `coding_session_id UUID FK coding_sessions`, optional submission FK, `signal_type`, severity (`info`, `low`, `medium`, `high`), optional confidence `[0,1]`, rationale, status (`new`, `reviewed`, `inconclusive`, `follow_up`), detector name/version, timestamp.

Possible signals: large paste, unusually rapid code appearance, little visible write-run-fix activity, unusually uniform typing cadence, frequent editor focus/visibility changes, or large code replacement. These are not proof of misconduct.

### `integrity_signal_evidence`

`signal_id UUID FK integrity_signals`, `session_event_id UUID FK session_events`, `evidence_role`; primary key `(signal_id, session_event_id)`. The UI must navigate from a signal to the associated event/time range.

### `integrity_reviews`

`id UUID PK`, `signal_id UUID FK integrity_signals`, `reviewer_id UUID FK profiles`, outcome (`explainable`, `inconclusive`, `needs_follow_up`, `no_issue_identified`), notes, timestamp. A signal must not automatically fail, suspend, or punish a student.

## 12. Code explanation / viva

### `viva_questions`

`id UUID PK`, `submission_id UUID FK submissions`, `question_text`, `question_type`, `evaluation_rubric jsonb`, optional expected code behavior and model metadata, status (`draft`, `published`, `answered`, `review_required`), timestamp.

### `viva_answers`

`id UUID PK`, `viva_question_id UUID FK viva_questions`, `student_id UUID FK profiles`, `answer_text`, optional score/max score, evaluation rationale/evidence JSONB, model/version metadata, review status (`evaluated`, `needs_review`, `reviewed`), optional reviewer, timestamps. Evaluation must check technical alignment with the submitted code, not writing style or fluency alone.

## 13. Audit logs

### `audit_logs`

`id UUID PK`, optional actor FK, `action`, `entity_type`, optional `entity_id`, `details jsonb`, optional request ID, timestamp. Log course/test publication, role changes, execution configuration changes, and integrity reviews. Never log passwords, API keys, hidden test inputs, or unnecessary sensitive content.

---

## 14. Relationship summary

| Relationship | Cardinality |
|---|---|
| Auth user → profile | 1:1 |
| Course → course versions | 1:many |
| Course version → modules | 1:many |
| Module → concepts | 1:many |
| Concept → objectives | 1:many |
| Concept ↔ prerequisite concepts | many:many |
| Question version ↔ concepts | many:many |
| Assessment → attempts | 1:many |
| Attempt → answers | 1:many |
| Student + concept → current mastery | 1:1 per scope |
| Student + concept → mastery history | 1:many |
| Student → recommendations | 1:many |
| Coding session → events | 1:many |
| Submission → execution jobs/results | 1:many |
| Signal ↔ evidence events | many:many |
| Signal → reviews | 1:many |
| Submission → viva questions | 1:many |

## 15. Indexing strategy

Create indexes based on actual query patterns. Suggested starting indexes:

- `enrollments(student_id, status)` and `enrollments(course_id, status)`
- `course_versions(course_id, version_number)`
- `modules(course_version_id, order_index)`
- `concepts(module_id, order_index)`
- `concept_prerequisites(prerequisite_concept_id)`
- `learning_resources(concept_id, review_status)`
- `questions(review_status, question_type, difficulty)`
- `question_concepts(concept_id, question_version_id)`
- `assessments(course_version_id, status)`
- `assessment_attempts(student_id, assessment_id, started_at DESC)`
- `learning_attempts(student_id, concept_id, occurred_at DESC)`
- `mastery_history(student_id, concept_id, created_at DESC)`
- `recommendations(student_id, status, created_at DESC)`
- `session_events(session_id, sequence_number)`
- `submissions(student_id, created_at DESC)`
- `execution_jobs(status, created_at)`
- `integrity_signals(coding_session_id, status, created_at)`
- `audit_logs(actor_id, created_at DESC)`

Use GIN indexes for JSONB/full-text search only where needed. Indexes increase write and storage costs.

## 16. Supabase RLS and access policy

Enable RLS on every table exposed through the Supabase Data API. Define policies based on authenticated identity, role, enrollment, course ownership/assignment, and resource ownership.

**Students:** may read published courses they are enrolled in, approved learning resources, their own attempts/answers/submissions/sessions/mastery/recommendations, and permitted result summaries. They must not read other students' records, answer keys, hidden tests, private evaluator configuration, or trainer-only review notes.

**Trainers:** may manage courses assigned to them and review data only for authorized courses and students. Publishing requires the appropriate role and course permission.

**Administrators:** receive only the operational access required; privileged operations must be audited.

Supabase service-role credentials bypass RLS. Any backend route using them must authenticate the caller, authorize the resource, validate inputs, and return only permitted fields. Never place the service-role key in browser code. Test policies with student, trainer, and admin accounts.

## 17. Privacy and retention

Define retention periods for uploaded files, extracted text, generated content, source code, editor events/replay snapshots, integrity reviews, AI prompts/responses, and audit logs. Disclose event recording before assessments. Do not capture unrelated browsing activity, passwords, or unrelated clipboard contents. Minimize student data sent to LLM providers and review provider retention terms. Implement deletion/anonymization and export workflows according to applicable institutional and legal obligations.

## 18. Migration layout

```text
supabase/
  migrations/
    0001_identity_courses.sql
    0002_syllabus_concepts.sql
    0003_resources_and_generation.sql
    0004_questions_assessments.sql
    0005_mastery_recommendations.sql
    0006_coding_sessions_submissions.sql
    0007_integrity_viva_audit.sql
    0008_rls_policies.sql
  seed.sql
```

Seed only synthetic sample data: one sample course, modules, concepts, an acyclic prerequisite graph, sample resources, and approved sample questions. Never seed real student data, production secrets, or publicly accessible hidden test cases.

## 19. Starter SQL migration

The following is a **starter foundation**, not the complete schema. Add the remaining tables in subsequent migrations and implement RLS before exposing data through the API.

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student'
    check (role in ('student', 'trainer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  learning_audience text,
  learning_goals jsonb not null default '[]'::jsonb,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, version_number)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, student_id)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (course_version_id, order_index)
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0 check (order_index >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, name)
);

create table public.concept_objectives (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  objective_text text not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create table public.concept_prerequisites (
  concept_id uuid not null references public.concepts(id) on delete cascade,
  prerequisite_concept_id uuid not null references public.concepts(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (concept_id, prerequisite_concept_id),
  check (concept_id <> prerequisite_concept_id)
);

create table public.student_mastery (
  student_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  mastery_probability numeric(6,5) not null
    check (mastery_probability between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  model_name text not null default 'rule_based_v1',
  model_version text not null default '1.0',
  last_evidence_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, concept_id)
);

create table public.mastery_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  previous_probability numeric(6,5)
    check (previous_probability is null or previous_probability between 0 and 1),
  new_probability numeric(6,5) not null check (new_probability between 0 and 1),
  evidence_source_type text not null,
  evidence_source_id uuid,
  model_name text not null,
  model_version text not null,
  reason jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_version_id uuid not null references public.course_versions(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  resource_id uuid,
  question_version_id uuid,
  activity_type text not null
    check (activity_type in ('read', 'watch', 'quiz', 'coding', 'review', 'project')),
  reason text not null,
  priority numeric(8,4),
  status text not null default 'recommended'
    check (status in ('recommended', 'accepted', 'completed', 'dismissed', 'expired')),
  model_version text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (concept_id is not null or resource_id is not null or question_version_id is not null)
);

create index idx_enrollments_student_status
  on public.enrollments(student_id, status);
create index idx_modules_version_order
  on public.modules(course_version_id, order_index);
create index idx_concepts_module_order
  on public.concepts(module_id, order_index);
create index idx_prerequisites_reverse
  on public.concept_prerequisites(prerequisite_concept_id);
create index idx_mastery_history_student_concept_time
  on public.mastery_history(student_id, concept_id, created_at desc);
create index idx_recommendations_student_status_time
  on public.recommendations(student_id, status, created_at desc);
```

### Starter SQL notes

- Add foreign keys for `recommendations.resource_id` and `question_version_id` after those tables are created.
- Validate prerequisite scope and acyclicity in a trusted service or database trigger.
- Do not let clients update their own `profiles.role`.
- RLS policies are deliberately not included in this starter snippet; they must be implemented and tested before exposing the tables.
- Decide how concepts are mapped across course versions before carrying mastery forward.

## 20. Acceptance checklist

- [ ] All tables, constraints, and indexes are in version-controlled migrations.
- [ ] Prerequisite cycles and invalid cross-version edges are rejected.
- [ ] Course, question, and assessment versioning preserves historical results.
- [ ] Mastery processing is idempotent and history is retained.
- [ ] Student/trainer/admin RLS policies are tested.
- [ ] Hidden test cases, answer keys, and reference solutions are protected.
- [ ] Source code and event payloads have size limits and retention rules.
- [ ] Session events can be ordered and replayed.
- [ ] Integrity signals link to exact evidence events.
- [ ] AI-generated content has draft/review states.
- [ ] Fresh project setup succeeds using migrations and synthetic seed data.
- [ ] No secrets or real student data are committed to the repository.

## 21. Data ownership rules

- Trainers author and approve curriculum; AI outputs remain drafts until reviewed.
- Published learning resources and assessment items are versioned.
- Students can access their own submissions; trainers can review only authorized courses.
- Mastery is a derived estimate with preserved evidence/history.
- Recommendations record their target and reason.
- Execution results are produced by an isolated execution service and stored with minimum necessary detail.
- Integrity signals support human review and are not automatic verdicts.
- Access and retention are limited to legitimate learning and assessment needs.
