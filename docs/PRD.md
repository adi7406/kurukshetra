# Product Requirements Document (PRD)
## Adaptive Learning and Assessment Portal

**Document status:** Draft for review  
**Version:** 1.0  
**Product type:** Web-based learning, adaptive assessment, and coding-integrity review platform  
**Primary users:** Students, trainers/instructors, and platform administrators

---

## 1. Executive Summary

The Adaptive Learning and Assessment Portal personalizes learning based on each student's demonstrated understanding and evaluates both the final answer and the process used to produce it.

The platform models a course as a prerequisite-aware concept graph, estimates each student's mastery of individual concepts, and recommends the next lesson or exercise accordingly. It supports theory learning, quizzes, coding assessments with hidden test cases, secure multi-language code execution, replayable coding sessions, evidence-linked integrity signals, and AI-generated code-explanation questions. Student and trainer dashboards make learning progress and assessment evidence visible.

The platform must treat behavioral signals as evidence for human review, not as automatic proof of cheating. Trainers retain control over curriculum approval, published assessments, and integrity decisions.

### Product vision

Build a learning environment where every student follows a path suited to their current knowledge, and every assessment gives students and trainers useful evidence about understanding.

---

## 2. Problem Statement

Students in the same cohort often have different levels of understanding, but conventional learning platforms generally move them through a fixed sequence. A student who has not mastered a prerequisite may continue into advanced topics, allowing knowledge gaps to compound.

Online coding assessments frequently evaluate only the final submitted code. They may not reveal whether the student understands the solution, how the solution was developed, or which concepts remain weak. Scores alone often provide insufficient guidance for improvement.

Trainers also need a scalable way to identify class-wide learning gaps, create assessments, review coding behavior, and provide targeted support.

The product addresses these problems through:
- Prerequisite-aware adaptive learning.
- Per-concept mastery estimation.
- Theory and practice mapped to syllabus concepts.
- Configurable test series and validated AI-assisted question generation.
- Secure, isolated code execution.
- Replayable coding-session timelines.
- Evidence-linked integrity signals for human review.
- Code-specific explanation/viva assessment.
- Student and trainer analytics.

---

## 3. Goals and Success Criteria

### 3.1 Product goals

1. Represent a course syllabus as structured modules, concepts, learning objectives, and prerequisite relationships.
2. Support manual syllabus creation, AI-assisted syllabus generation, and syllabus-document upload.
3. Provide theory, examples, quizzes, and coding exercises linked to concepts.
4. Estimate student mastery and update estimates after relevant learning activities.
5. Recommend the next activity using mastery, prerequisite readiness, learning objectives, and activity history.
6. Support trainer-authored and AI-assisted assessments, including formal test series.
7. Execute code in an isolated environment against sample and hidden test cases.
8. Capture a replayable timeline of relevant coding-editor events.
9. Present integrity signals with timestamps and evidence, without automatically declaring misconduct.
10. Ask students to explain their own code and evaluate whether explanations match the implementation.
11. Provide actionable student feedback and useful class-level insights to trainers.

### 3.2 Proposed success metrics

These are initial targets for product validation, not guaranteed outcomes.

- At least 90% of approved syllabus concepts have learning objectives and at least one associated learning resource or activity.
- At least 95% of valid coding submissions receive a terminal execution status (passed, failed, timed out, memory limit, compile error, or infrastructure error) rather than remaining indefinitely pending.
- Every displayed integrity signal links to one or more replay events or a clearly identified evidence range.
- Every published AI-generated assessment item has passed structural validation and the configured review workflow.
- A student can see the reason for a recommendation and the concept it targets.
- Trainers can inspect concept-level mastery and identify common weak areas without exporting raw database records.
- No integrity signal alone automatically results in a cheating verdict or punitive action.

Metrics should be reviewed after usability testing and a pilot with real learners.

---

## 4. Scope

### 4.1 MVP scope — required

- Student and trainer accounts with role-based authorization.
- Course and module management.
- Three syllabus creation paths:
  - Manual authoring.
  - AI-generated draft syllabus.
  - PDF/DOCX/text upload and extraction.
- Trainer review and approval of syllabus, concepts, prerequisites, theory, and generated content.
- Concept graph with prerequisite relationships and learning objectives.
- Theory/resource library linked to concepts.
- AI-assisted theory drafting and personalized explanations.
- Question bank for MCQs, short answers, output prediction, debugging, code completion, and coding tasks.
- Quiz and fixed test-series creation.
- Initial adaptive practice recommendations.
- Rule-based mastery estimation, designed so BKT can be introduced without redesigning the application.
- Browser code editor with at least one configured programming language; architecture must support multiple languages.
- Integration with an isolated code-execution service such as Judge0.
- Sample and hidden test cases.
- Coding-event recording and basic replay.
- Rule-based integrity signals with timestamps and evidence.
- Two or three code-specific explanation questions after a coding submission.
- Student and trainer mastery dashboards.
- Audit, privacy, and access controls.

### 4.2 Phase 2 — advanced features

- Bayesian Knowledge Tracing (BKT) mastery model.
- Improved adaptive question difficulty and spaced-repetition scheduling.
- More complete event replay and replay navigation from integrity signals.
- Voice-based viva using speech-to-text.
- Class-wide trend analysis and richer learning analytics.
- More sophisticated integrity-signal calibration.
- Retrieval-Augmented Generation (RAG) over trainer-provided learning materials.
- More extensive question quality evaluation and duplicate detection.

### 4.3 Optional future scope

- Browser-based DevOps labs with automatically verified tasks.
- GitHub repository/project evaluation.
- Line-level code review comments.
- Project-specific viva questions.
- Repository test execution in an isolated environment.
- Course-level progress comparisons and additional integrations.

### 4.4 Out of scope for the initial release

- Automatic punitive decisions based on integrity signals.
- Unrestricted execution of student code on the application server.
- Fully autonomous publication of unreviewed AI-generated syllabi or high-stakes exams.
- Replacing trainers or institutionally approved curriculum.
- Guaranteed detection of all AI-assisted work or cheating.
- A custom production-grade sandbox built from scratch if a suitably configured execution service is available.

---

## 5. Users, Roles, and Permissions

### 5.1 Student

Can:
- View enrolled and published courses.
- Access approved theory and learning resources.
- Complete practice activities and assessments.
- Run and submit code within configured limits.
- View own answers, scores, feedback, mastery estimates, and learning history.
- View recommendations and their explanations.
- Complete code-explanation/viva questions.
- View own coding-session replay where enabled.

Cannot:
- View other students' private data, submissions, or integrity records.
- Read hidden test inputs or expected outputs.
- Publish or alter course curriculum.
- Access trainer-only review notes or privileged execution-service details.

### 5.2 Trainer/Instructor

Can:
- Create and manage courses, modules, concepts, objectives, and prerequisites.
- Upload or generate a syllabus draft.
- Review, edit, approve, archive, and version course content.
- Create, edit, review, and publish questions and assessments.
- Configure test blueprints, timing, marks, and allowed languages.
- View enrolled students' learning progress and assessment results.
- Review coding-session replays and evidence-linked integrity signals.
- Add human-review outcomes and notes.
- Assign additional learning resources or activities.

Cannot:
- Access platform secrets or unrestricted infrastructure controls.
- View hidden test data through student-facing interfaces.
- Make an automatic misconduct determination solely from a model score.

### 5.3 Platform administrator

Can:
- Manage accounts, roles, system configuration, integrations, and platform-level monitoring.
- Configure allowed languages, execution-service settings, quotas, and retention policies.
- Review audit events and operational failures.
- Manage access and security settings.

Administrative access must be limited to what is needed for platform operations and audited.

---

## 6. Core User Journeys

### 6.1 Trainer creates a course

1. Trainer creates a course and specifies its title, audience, objectives, and optional duration.
2. Trainer chooses manual creation, AI generation, or document upload.
3. The system extracts or generates a proposed module/concept structure.
4. The system suggests learning objectives and prerequisite edges.
5. The system validates the structure for missing fields, duplicate concepts, invalid references, and cycles in the prerequisite graph.
6. Trainer reviews and edits the draft.
7. Trainer adds or generates theory, examples, and questions.
8. Trainer approves and publishes a course version.
9. Students enrolled in the published version can begin learning.

### 6.2 Student learns adaptively

1. Student opens a course.
2. The system loads the student's current mastery estimates and activity history.
3. The recommendation service identifies eligible concepts, considering prerequisites.
4. The system recommends a lesson, explanation, quiz, or exercise and explains why it was selected.
5. Student completes the activity.
6. The system records the attempt and updates mastery.
7. The next recommendation reflects the new evidence.

### 6.3 Student completes a coding assessment

1. Student opens a coding question and reads the prompt and constraints.
2. Student writes and runs code in the browser editor.
3. The client records configured editor events with timestamps.
4. When submitted, the backend validates the request and creates an execution job.
5. The isolated execution service compiles/runs the code against authorized test cases.
6. The platform records status, scores, and permitted execution metrics.
7. The event analysis service derives integrity signals from the session timeline.
8. The platform generates two or three questions about the submitted solution.
9. Student responds; the evaluation service assesses technical alignment with the code.
10. Relevant assessment evidence updates concept mastery.
11. The student receives feedback; the trainer can inspect results and any flagged evidence.

### 6.4 Trainer reviews an integrity signal

1. Trainer opens a flagged session.
2. The interface shows the signal type, timestamp, severity/confidence, rationale, and evidence range.
3. Trainer jumps to the corresponding replay moment.
4. Trainer reviews surrounding activity and relevant context.
5. Trainer records a review outcome, if appropriate.
6. The system stores the reviewer, timestamp, and decision history.
7. A signal alone does not trigger an automatic cheating verdict.

---

## 7. Functional Requirements

Priority definitions: **P0 = MVP must-have; P1 = important next phase; P2 = optional/future.**

### FR-01: Authentication and role-based access — P0

- Users can authenticate securely.
- Each user has a role and profile.
- Backend authorization must enforce role and resource ownership.
- Database policies must prevent cross-student data access.
- Sensitive actions must be audited.

### FR-02: Course and syllabus management — P0

- Trainers can create courses, modules, concepts, objectives, and resources.
- A concept can have zero or more prerequisites.
- The system must reject prerequisite cycles and invalid references.
- Course content must support draft, review, published, and archived states.
- Published content changes must be versioned or otherwise preserve the context of existing attempts.
- Trainers can manually edit AI-extracted or generated content.

### FR-03: Syllabus import and generation — P0

Supported paths:
1. Manual authoring.
2. AI-generated draft based on course title, goals, audience, level, and duration.
3. PDF, DOCX, or text upload.

Processing requirements:
- Extract text from supported documents.
- Use OCR for scanned PDFs if enabled.
- Convert content into a structured schema containing modules, concepts, objectives, and proposed prerequisites.
- Preserve source-document references where possible.
- Flag low-confidence or ambiguous extraction for review.
- Validate the output before persistence.
- Require trainer approval before publication.
- Never assume document order alone proves a prerequisite relationship.

### FR-04: Concept map and prerequisites — P0

- Store concepts as individually addressable learning units.
- Support multiple prerequisites per concept.
- Display a concept map or equivalent navigable view.
- Detect cycles and broken edges.
- Support prerequisite readiness checks.
- Permit independent concepts to coexist in a module.
- Allow trainers to change relationships with audit/version history.

### FR-05: Theory and learning resources — P0

- Associate resources with one or more concepts.
- Support text notes, examples, links, and permitted uploaded documents.
- Allow trainers to create and edit theory.
- Allow AI to draft explanations, summaries, examples, glossary terms, common mistakes, and practice prompts.
- Store generated content with its source/context, model metadata where available, review status, and version.
- Allow personalized explanation variants by learner level.
- When course-specific accuracy matters, retrieve from trainer-provided material using RAG or a comparable grounded approach.
- Display a clear indication when content is AI-generated and not yet trainer-approved.
- Never publish unreviewed generated material automatically into a high-stakes course by default.

### FR-06: Question bank — P0

Supported types:
- Single-answer MCQ.
- Multiple-select.
- Short answer.
- Theory/long answer.
- Output prediction.
- Debugging.
- Code completion.
- Full coding problem.
- Conceptual explanation.

Each question should include, where relevant:
- Concept mapping.
- Learning objective.
- Difficulty.
- Type.
- Prompt and constraints.
- Correct answer or reference solution.
- Explanation/rubric.
- Marks.
- Estimated time.
- Language support.
- Test cases for coding questions.
- Source and review status.
- Creation method (manual/AI/imported).

Questions can be reused across assessments without duplicating their canonical records.

### FR-07: Assessment and test-series management — P0

- Trainers can create practice quizzes, fixed tests, and test series.
- Trainers can define coverage, question counts, question types, difficulty distribution, marks, time limit, attempts, and optional negative marking.
- A test blueprint maps the desired distribution of questions to concepts and difficulty levels.
- The platform can select questions from the approved question bank.
- AI can draft questions to fill blueprint gaps.
- Generated items must pass schema and answer validation; coding items must be executed against test cases in the sandbox.
- Trainer review is required before publishing AI-generated questions in formal assessments.
- Published tests must preserve the question versions used for each attempt.
- Hidden test cases and answer keys must remain server-side.
- Adaptive practice may change question selection; formal tests can use a fixed blueprint for comparability.

### FR-08: Mastery estimation — P0 basic, P1 BKT

MVP:
- Maintain a mastery estimate for each student/concept pair.
- Update estimates after relevant activities.
- Store attempt history and mastery history.
- Support an initial rule-based model.
- Keep the model behind a service interface so it can be replaced by BKT.

Advanced:
- Implement Bayesian Knowledge Tracing with initial mastery, transition/learning, guess, and slip parameters.
- Calibrate parameters with suitable data when available.
- Explain that mastery is an estimate, not a guarantee.
- Avoid updating a concept from unrelated questions unless their concept mapping explicitly supports it.
- Incorporate correctness, question quality/difficulty, hints, and evidence reliability where supported.
- Track model version and timestamp for reproducibility.

### FR-09: Adaptive recommendation engine — P0 basic

The recommendation service must:
- Retrieve weak or insufficiently evidenced concepts.
- Check prerequisite readiness.
- Prioritize prerequisite gaps over downstream concepts when appropriate.
- Select an activity type suited to the learner's needs.
- Consider recent attempts, activity history, question difficulty, and available resources.
- Avoid recommending already-completed identical activities repeatedly without reason.
- Provide an explanation for each recommendation.
- Record recommendation status and whether it was accepted/completed.

Initial approach:
1. Identify concepts below a configurable mastery threshold or with insufficient evidence.
2. Check prerequisites and identify the earliest actionable gap.
3. Select an appropriate theory resource or question.
4. Choose a suitable difficulty.
5. Update after the next attempt.

The threshold must be configurable and should not be treated as a universal educational standard. If no concept needs remediation, recommend revision, an advanced activity, or the next ready concept.

### FR-10: Browser-based coding editor — P0

- Integrate Monaco Editor.
- Support the configured programming languages and syntax highlighting.
- Allow editing, running, and submitting code.
- Show compile/runtime errors and sample-test results.
- Enforce request and submission limits.
- Save submission versions and session metadata.
- Record relevant editor events with timestamps.
- Do not expose server credentials or execution-service secrets to the browser.

### FR-11: Secure code execution — P0

- Execute submissions only through an isolated execution service.
- Support multiple languages according to the configured runtime matrix.
- Run sample and hidden test cases.
- Return structured statuses such as accepted, wrong answer, compile error, runtime error, time limit exceeded, memory limit exceeded, output limit exceeded, and infrastructure error.
- Apply CPU, memory, wall-clock, process, and output limits.
- Restrict network access, filesystem access, privileges, and system calls according to the execution provider's security model.
- Run with least privilege; do not mount application secrets or host-sensitive directories.
- Prevent access to the Docker socket or privileged host capabilities.
- Treat timeouts and infrastructure failures distinctly from wrong answers.
- Keep hidden test inputs and expected outputs inaccessible to students.
- Rate-limit submissions and protect the queue from abuse.
- Record execution metadata needed for debugging without storing unnecessary sensitive information.

Preferred MVP: integrate a suitable Judge0 deployment/provider or equivalent. Docker alone is not a complete security boundary; production deployment may require hardened runtime settings or stronger isolation such as gVisor or microVMs.

### FR-12: Coding-session event capture — P0

Capture only events needed for assessment integrity and replay, such as:
- Text insertion and deletion/change deltas.
- Paste operations and approximate inserted character count.
- Run events.
- Submission events.
- Editor focus/blur and browser visibility changes where permitted.
- Timestamps and session identifiers.

Requirements:
- Events must be ordered and replayable.
- The system should support event batching and recovery after temporary network failure.
- Event collection must be disclosed to students before an assessment.
- Avoid recording unrelated browsing activity, passwords, or unrelated clipboard contents.
- Define retention periods and access controls.
- Clearly indicate when recording is unavailable or incomplete.

### FR-13: Session replay — P0 basic, P1 full

- Reconstruct code state from recorded editor changes.
- Provide a chronological timeline.
- Mark run, paste, submission, focus/visibility, and integrity-signal events.
- Allow a reviewer to jump to a timestamp or event.
- Show when the timeline is incomplete or contains gaps.
- Preserve a read-only replay view for reviewers.
- Ensure signals link to the exact relevant event or evidence range.

### FR-14: Integrity signals and human review — P0

Initial rule-based signals may include:
- Large paste or sudden large insertion.
- Code appearing unusually quickly compared with the student's available typing baseline.
- Very limited visible write-run-fix activity.
- Unusually uniform typing cadence.
- Frequent editor focus loss or browser visibility changes.
- Large sudden replacement of existing code.

Requirements:
- Signals must include type, timestamp, evidence event references, rationale, and severity/confidence where available.
- Baselines must account for limited history; do not imply personalized certainty when no baseline exists.
- Do not infer AI use or cheating solely from a signal.
- Do not automatically fail, suspend, or punish a student based on signals.
- Provide trainer review and an audit trail.
- Allow reviewers to mark signals as reviewed, explainable, inconclusive, or requiring follow-up.
- Avoid presenting tab switching or paste activity as conclusive proof.
- Evaluate signal usefulness and false-positive rates during pilots.

### FR-15: Code explanation/viva — P0 text, P1 voice

- After a coding submission, generate two or three questions based on the student's submitted code.
- Questions may address logic, data structures, edge cases, complexity, design decisions, and likely behavior under changed inputs.
- The question generator must receive the code, problem statement, language, and relevant evaluation context.
- Students can answer in text in the MVP.
- An evaluator compares the answer to what the code actually does, not merely to a generic ideal answer.
- Feedback should identify correct reasoning, missing details, and mismatches with the implementation.
- Save questions, answers, scores/rubric evidence, and model/version metadata where appropriate.
- Uncertain or high-impact evaluations should be available for trainer review.
- Do not treat speech fluency or writing style as a proxy for technical understanding.
- Voice input and speech-to-text are optional future capabilities.

### FR-16: Student dashboard — P0

Show:
- Enrolled courses and current activity.
- Concept-level mastery estimates and trends.
- Strong, developing, weak, and insufficiently evidenced concepts.
- Recommended next activities and reasons.
- Theory and resource links.
- Quiz/test history and scores.
- Coding submission results and feedback.
- Viva results.
- Relevant integrity notices only where appropriate and according to the review policy.

The interface must communicate that mastery scores are estimates.

### FR-17: Trainer dashboard — P0

Show:
- Student-level and class-level concept mastery.
- Commonly misunderstood concepts.
- Assessment outcomes and trends.
- Students needing additional support.
- Question-level performance and possible ambiguous questions.
- Coding submissions and execution status.
- Integrity signals with replay navigation.
- Human-review status and notes.
- Filters by course, module, concept, assessment, and student.

Access must be restricted to courses and students the trainer is authorized to manage.

### FR-18: Optional DevOps labs — P2

- Provide isolated browser-based labs for tasks such as Dockerfile authoring, basic Linux commands, CI/CD configuration, and environment setup.
- Automatically verify tasks using predefined checks.
- Apply strict resource, time, network, and filesystem restrictions.
- Keep lab credentials and environment secrets isolated.
- Do not include in MVP unless core requirements are complete.

### FR-19: Optional repository evaluation — P2

- Allow an authorized student to connect or upload a repository.
- Analyze project structure and source code.
- Run permitted tests in an isolated environment.
- Generate line-level review comments with file/line references.
- Generate project-specific viva questions.
- Clearly distinguish deterministic static-analysis findings from AI-generated suggestions.
- Require human review for consequential evaluation decisions.
- Respect repository permissions, licensing, and data-retention requirements.

---

## 8. Syllabus, Theory, and Assessment Content Lifecycle

### 8.1 Syllabus creation modes

**Manual:** Trainer creates modules, concepts, objectives, and prerequisite edges.

**AI-generated:** Trainer enters course title, audience, learning goals, level, and optional duration. The model returns a structured draft.

**Document upload:** Trainer uploads a PDF, DOCX, or text syllabus. The system extracts text, optionally uses OCR for scanned documents, and proposes structured modules and concepts.

All modes lead to a common review interface. A trainer must be able to edit the draft before publication.

### 8.2 Syllabus structure

A syllabus version should contain:
- Course metadata.
- Modules and ordering.
- Concepts.
- Learning objectives.
- Prerequisite relationships.
- Recommended theory/resource links.
- Assessment coverage.
- Source references where applicable.
- Review and publication status.

Prerequisite graphs must be acyclic. The system should warn about concepts with missing prerequisites or objectives but should not assume every concept needs a prerequisite.

### 8.3 Theory content lifecycle

1. Link existing resources to concepts.
2. Optionally generate draft explanations and examples.
3. Validate structure and source grounding.
4. Trainer reviews and edits.
5. Publish approved content.
6. Recommend content based on student needs.
7. Track usage and feedback.

RAG should be used when answers must be grounded in uploaded institutional materials. AI-generated explanations must not silently override the official syllabus.

### 8.4 Question and test lifecycle

1. Trainer chooses concepts and creates a test blueprint.
2. The system selects approved questions from the bank.
3. AI may draft missing items.
4. Automated checks validate structure, answer fields, duplicates, and concept mapping.
5. Coding questions and reference solutions are executed in a sandbox against test cases.
6. Trainer reviews generated questions for formal tests.
7. Test is published as a versioned assessment.
8. Student attempts are linked to that version.

### 8.5 Test types

- **Practice quiz:** Focused on one or more concepts, with immediate feedback.
- **Adaptive practice:** Next question depends on mastery and previous responses.
- **Fixed test:** A consistent blueprint for comparable assessment.
- **Test series:** Multiple assessments arranged by module or syllabus progression.
- **Coding assessment:** Code execution with hidden tests and optional integrity review.
- **Theory assessment:** MCQs, short answers, and longer responses evaluated with answer keys/rubrics and, where appropriate, trainer review.

Adaptive test scores should not be compared naively with fixed test scores because students may receive different questions.

---

## 9. Mastery and Recommendation Design

### 9.1 MVP mastery model

Start with a simple, documented update model. One possible baseline is:

`new_mastery = old_mastery + alpha * (observed_result - old_mastery)`

Where:
- `old_mastery` is the previous estimate between 0 and 1.
- `observed_result` is 1 for correct and 0 for incorrect.
- `alpha` is a configurable learning rate.

This is a pragmatic baseline, not a complete cognitive model. It does not inherently distinguish guessing, slipping, forgetting, or learning. Do not present it as BKT.

The implementation should allow future models to consider difficulty, hints, repeated attempts, question discrimination, and the reliability of different evidence types.

### 9.2 BKT phase

Implement BKT as a separate mastery-model implementation with parameters:
- Initial knowledge probability.
- Learning/transition probability.
- Guess probability.
- Slip probability.

Store model version and parameters so mastery estimates can be reproduced or recalculated when the model changes.

### 9.3 Evidence inputs

Potential evidence includes:
- MCQ correctness.
- Theory answer rubric score.
- Coding test outcomes.
- Code explanation/viva evaluation.
- Repeated performance across distinct questions.
- Hint use and number of attempts.

Integrity signals should not directly lower academic mastery. They belong to a separate human-review workflow unless a trainer-approved assessment policy defines an appropriate, transparent consequence.

### 9.4 Recommendation decision logic

1. Retrieve mastery and evidence sufficiency by concept.
2. Identify weak or uncertain concepts.
3. Check prerequisite readiness.
4. Prioritize an actionable prerequisite gap.
5. Select an activity type: theory, example, quiz, coding task, or revision.
6. Select an appropriate difficulty and available resource.
7. Return a human-readable reason.
8. Record whether the student accepted/completed the recommendation.
9. Recompute after new evidence.

If no remediation is needed, recommend the next ready concept, spaced revision, or an advanced activity.

---

## 10. High-Level Technical Architecture

### 10.1 Recommended stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite | Student and trainer web application |
| UI styling | Tailwind CSS | Responsive layouts and UI components |
| Code editor | Monaco Editor | Code authoring and editor event instrumentation |
| Backend API | Node.js + Express (JavaScript) | Authorization, business logic, orchestration |
| Database | Supabase PostgreSQL | Relational application data |
| Authentication | Supabase Auth | User authentication |
| File storage | Supabase Storage | Approved syllabus uploads and permitted attachments |
| AI generation/evaluation | Configurable LLM API or deployed model | Draft syllabus, theory, questions, and code-viva evaluation |
| Retrieval | PostgreSQL full-text search and/or vector retrieval | Grounding content in uploaded learning materials |
| Code execution | Judge0 or equivalent isolated execution service | Compile/run code against test cases |
| Event capture/replay | Monaco instrumentation + backend event APIs | Timeline and replay data |
| Charts | Recharts | Mastery and assessment analytics |
| Deployment | Vercel for frontend plus suitable API/worker hosting | Application hosting |
| Version control | Git and GitHub | Source control and collaboration |

The LLM provider and execution provider should be configured through server-side environment variables. Secrets must never be exposed to the browser.

### 10.2 Logical service boundaries

The backend can begin as a modular monolith, with clear internal services:
- Auth and authorization.
- Course and syllabus service.
- Content generation service.
- Question bank and assessment service.
- Mastery service.
- Recommendation service.
- Code execution adapter.
- Coding session/event service.
- Integrity analysis service.
- Viva generation/evaluation service.
- Analytics service.

Long-running AI generation and code execution should use background jobs or asynchronous workflows rather than blocking normal API requests.

### 10.3 Architecture flow

1. Browser sends authenticated request to Express API.
2. API validates identity, role, ownership, and request schema.
3. API reads/writes PostgreSQL.
4. AI-related jobs are sent to the configured model provider with only necessary context.
5. Coding submissions are sent to the isolated execution service.
6. Results and events are stored in the database.
7. Mastery and recommendation services process relevant outcomes.
8. Dashboards query authorized aggregate and individual data.

---

## 11. Proposed Database Design

Use UUID primary keys where appropriate, foreign keys, timestamps, indexes, and explicit lifecycle states. Exact SQL migrations should be created during implementation.

### 11.1 Core tables

| Table | Purpose / key fields |
|---|---|
| `profiles` | `id` (auth user ID), `display_name`, `role`, timestamps |
| `courses` | `id`, `title`, `description`, `created_by`, `status` |
| `course_versions` | `id`, `course_id`, `version`, `status`, publication metadata |
| `enrollments` | `student_id`, `course_id`, enrollment status |
| `modules` | `id`, `course_version_id`, `title`, `order_index` |
| `concepts` | `id`, `module_id`, `name`, `description`, `status` |
| `concept_prerequisites` | `concept_id`, `prerequisite_concept_id` |
| `concept_objectives` | `id`, `concept_id`, `objective_text` |
| `learning_resources` | `id`, `concept_id`, `type`, `title`, `content/url`, `review_status`, `version` |
| `source_documents` | `id`, `course_id`, storage path, file type, extraction status, source metadata |
| `content_generation_jobs` | job type, inputs/reference IDs, status, errors, model metadata |
| `generated_content` | generated text/JSON, source references, review status, version |

### 11.2 Questions and assessments

| Table | Purpose / key fields |
|---|---|
| `questions` | `id`, `type`, `prompt`, `difficulty`, `status`, `created_by`, `source_type` |
| `question_concepts` | `question_id`, `concept_id`, optional objective reference |
| `question_options` | `id`, `question_id`, option text, ordering |
| `question_answers` | Protected answer key/reference answer; server-side access only |
| `question_rubrics` | evaluation criteria and scoring rules |
| `coding_test_cases` | `id`, `question_id`, protected input/expected output, visibility, weight |
| `assessments` | `id`, `course_version_id`, `title`, `type`, settings, status |
| `assessment_questions` | `assessment_id`, `question_id` or version reference, marks, position |
| `assessment_attempts` | `id`, `assessment_id`, `student_id`, status, start/end time, score |
| `student_answers` | `id`, `attempt_id`, question reference, answer, score, feedback |
| `test_results` | submission/test-case reference, status, permitted execution metrics |

### 11.3 Mastery and recommendations

| Table | Purpose / key fields |
|---|---|
| `student_mastery` | `student_id`, `concept_id`, `mastery_probability`, `evidence_count`, `model_version`, `updated_at` |
| `mastery_history` | student/concept, previous/new estimate, reason, model version, timestamp |
| `learning_attempts` | student, concept, question, correctness/score, difficulty, hint/attempt metadata |
| `recommendations` | student, concept/resource/activity, reason, priority, status, created/completed timestamps |
| `model_parameters` | model name/version and approved parameter configuration |

### 11.4 Coding sessions and integrity

| Table | Purpose / key fields |
|---|---|
| `coding_sessions` | student, assessment/question, started/ended time, recording status |
| `session_events` | session, sequence number, timestamp, event type, structured payload |
| `submissions` | student, question, session, language, source-code reference, status, created time |
| `execution_jobs` | submission, provider job ID, status, limits, timestamps |
| `integrity_signals` | session, signal type, severity/confidence, rationale, evidence event references, status |
| `integrity_reviews` | signal/session, reviewer, outcome, notes, timestamp |
| `viva_questions` | submission, prompt, expected evaluation criteria, generation metadata |
| `viva_answers` | question, student answer, score/rationale, review status |

### 11.5 Data model rules

- Use foreign keys and appropriate unique constraints.
- Ensure each student/concept mastery pair is unique for the applicable course/version context.
- Store event sequence numbers to reconstruct editor state reliably.
- Store timestamps in UTC and render them in the user's local timezone.
- Keep hidden test inputs, answer keys, and execution secrets out of client-readable tables or APIs.
- Apply Row Level Security and server-side authorization.
- Version course content and assessment questions so historic results remain interpretable.
- Avoid storing full source code redundantly in multiple tables; use references or controlled version storage where practical.
- Define retention/deletion policies for source documents, code, session events, and AI-provider data.

---

## 12. API Requirements — Initial Contract

The following are logical endpoints; exact naming and payload schemas are to be finalized during implementation.

### Authentication and courses
- `GET /api/me`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/:courseId/enrollments`

### Syllabus and content
- `POST /api/courses/:courseId/syllabus/import`
- `POST /api/courses/:courseId/syllabus/generate`
- `PUT /api/courses/:courseId/syllabus/draft`
- `POST /api/courses/:courseId/syllabus/publish`
- `POST /api/concepts/:conceptId/resources/generate`
- `GET /api/concepts/:conceptId/resources`

### Questions and assessments
- `POST /api/questions`
- `POST /api/questions/generate`
- `POST /api/assessments`
- `POST /api/assessments/:assessmentId/publish`
- `POST /api/assessments/:assessmentId/attempts`
- `POST /api/attempts/:attemptId/answers`
- `POST /api/attempts/:attemptId/submit`

### Mastery and recommendations
- `GET /api/students/:studentId/mastery`
- `GET /api/students/:studentId/recommendations`
- `POST /api/learning-attempts`
- `GET /api/concepts/:conceptId/mastery-trends`

### Coding
- `POST /api/coding-sessions`
- `POST /api/coding-sessions/:sessionId/events`
- `POST /api/submissions`
- `GET /api/submissions/:submissionId`
- `GET /api/coding-sessions/:sessionId/replay`
- `GET /api/coding-sessions/:sessionId/integrity-signals`

### Viva and review
- `POST /api/submissions/:submissionId/viva/generate`
- `POST /api/viva-questions/:questionId/answer`
- `POST /api/integrity-signals/:signalId/reviews`

All endpoints must validate schemas, authenticate users, enforce authorization, rate-limit sensitive operations, and return consistent error responses. Long-running jobs should return a job identifier and status rather than holding the HTTP request open.

---

## 13. Non-Functional Requirements

### 13.1 Security
- Enforce least privilege and server-side authorization.
- Use Supabase RLS for user-scoped data and test policies explicitly.
- Keep secrets in server-side environment variables or a secret manager.
- Validate and sanitize all inputs.
- Rate-limit login, AI generation, event ingestion, and code submissions.
- Use signed, time-limited links for protected files where appropriate.
- Protect hidden test cases and answer keys.
- Isolate untrusted code and restrict network, filesystem, CPU, memory, time, processes, and output.
- Audit privileged actions and integrity reviews.
- Avoid leaking stack traces, secrets, hidden test data, or other students' data.

### 13.2 Privacy and fairness
- Inform students which editor events are captured and why.
- Collect only data necessary for learning, assessment, replay, and integrity review.
- Do not collect unrelated browsing content or passwords.
- Define retention and deletion policies.
- Treat integrity signals as uncertain indicators.
- Provide contextual human review before consequential decisions.
- Make AI-assisted evaluation transparent and allow review of uncertain cases.
- Do not use typing style, tab switching, or AI-generated scores as standalone proof of misconduct.

### 13.3 Performance and reliability
Initial targets for a pilot:
- Normal dashboard/API reads: p95 under 500 ms, excluding external services and large reports.
- UI should show loading/progress states for AI generation and code execution.
- Execution and generation jobs must support timeouts, retries where safe, and terminal failure states.
- Event ingestion should tolerate temporary connectivity issues and preserve event order where possible.
- Background jobs must be observable and recoverable.
- Avoid duplicate execution or generation from repeated client requests through idempotency keys where appropriate.

### 13.4 Accessibility and usability
- Responsive layouts for desktop and tablet, with mobile-friendly viewing.
- Keyboard-accessible navigation and forms.
- Clear explanations of mastery scores and recommendations.
- Distinguish execution errors from wrong answers.
- Make replay controls understandable and provide event descriptions.
- Provide clear empty, loading, error, and partial-data states.

### 13.5 Maintainability
- Use modular JavaScript with standardized request/response schemas where practical.
- Separate domain logic from HTTP handlers.
- Add automated tests for mastery updates, prerequisite validation, recommendation selection, permissions, and assessment scoring.
- Keep AI provider and execution provider behind adapter interfaces.
- Maintain migrations and seed data in version control.
- Use structured logs and correlation IDs for asynchronous jobs.

---

## 14. AI Requirements and Guardrails

AI may be used for:
- Draft syllabus generation.
- Concept and objective extraction from supplied documents.
- Theory explanations and examples.
- Question and test-item drafting.
- Code-specific viva question generation.
- Explanation evaluation and feedback.
- Repository review in the future phase.

AI must not be the sole authority for:
- Publishing official syllabus structure without trainer approval.
- Publishing high-stakes assessment questions without review.
- Exposing hidden test cases.
- Declaring cheating.
- Making consequential decisions without appropriate human oversight.

Quality controls:
- Prefer structured JSON output for syllabus and question generation.
- Validate generated output against schemas.
- Preserve source references for document-grounded content.
- Test code and reference solutions in a sandbox.
- Detect missing fields, duplicate questions, invalid options, and prerequisite cycles.
- Record provider/model version and relevant prompt/template version where appropriate.
- Use only the minimum necessary student data in prompts.
- Treat uploaded documents and code as untrusted input; defend against prompt injection and instruction hijacking.
- Separate system instructions from retrieved document text and never allow uploaded content to override security policy.
- Display uncertainty or request trainer review when evaluation confidence is low.

---

## 15. Error Handling and Edge Cases

The product must account for:
- Empty, malformed, encrypted, unsupported, or oversized syllabus documents.
- Scanned documents requiring OCR.
- Duplicate concepts or ambiguous prerequisite edges.
- Cyclic prerequisite graphs.
- Missing theory for a concept.
- AI provider rate limits, timeouts, malformed output, or unavailable services.
- Invalid or duplicate questions.
- Compilation failures and runtime errors.
- Timeouts, memory limits, output limits, and execution-service outages.
- Incomplete coding-session event streams.
- Browser refresh or network interruption during an assessment.
- Student attempts after an assessment closes.
- A student with insufficient evidence for a reliable mastery estimate.
- No eligible next activity.
- Model evaluation disagreement with deterministic test results.
- A flagged integrity event that has an innocent explanation.
- Changes to a course after students have already attempted its assessments.

The UI must distinguish user errors, assessment outcomes, and infrastructure failures. Infrastructure failure should not silently be recorded as a wrong answer.

---

## 16. Testing and Acceptance Criteria

### Syllabus
- A trainer can create a syllabus manually, generate a draft, or upload a supported document.
- Extracted/generated content can be reviewed and edited before publication.
- Invalid references and prerequisite cycles are rejected.
- Published versions remain associated with historical attempts.

### Theory
- Resources can be mapped to concepts.
- AI-generated content is stored as a draft until approved where approval is required.
- Personalized recommendations link to relevant resources.
- Document-grounded responses can identify the source material used.

### Mastery and recommendations
- A submitted attempt creates a learning-attempt record.
- Mastery updates are deterministic for a fixed model version and input.
- Mastery is constrained to its valid range.
- Recommendation selection respects prerequisites.
- The user can see why an activity was recommended.
- Insufficient evidence is not displayed as certainty.

### Assessment
- A trainer can define a blueprint and publish a fixed test.
- Practice, fixed, and test-series assessments are distinguishable.
- Question versions used in attempts are preserved.
- Hidden tests and answer keys cannot be retrieved by student credentials.
- AI-generated coding questions are validated in an isolated environment before publication.

### Code execution
- Valid submissions execute only through the isolated service.
- Infinite loops terminate within configured limits.
- Memory and output limits are enforced.
- Network access and sensitive host resources are unavailable to untrusted submissions under the configured sandbox policy.
- Compile/runtime errors and infrastructure failures have distinct statuses.
- Hidden test inputs and expected outputs are not returned to students.

### Session replay and integrity
- Recorded events can reconstruct the code state in chronological order.
- Signals reference relevant event IDs/timestamps.
- A reviewer can navigate from a signal to the associated replay moment.
- Missing event data is clearly indicated.
- Signals do not automatically issue a cheating verdict or punitive action.

### Code viva
- The system can generate two or three questions based on a submission.
- Evaluation is grounded in the actual submitted code and problem context.
- Student answers and evaluation evidence are stored.
- Uncertain evaluations can be reviewed by a trainer.

### Dashboards and access
- Students can view only their own private learning and assessment data.
- Trainers can view only authorized course/student data.
- Dashboards show mastery, trends, and recommendations.
- RLS and API authorization tests cover cross-user access attempts.

---

## 17. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI creates incorrect theory or questions | Mislearning or invalid assessment | Draft/review workflow, schema checks, test execution, source grounding |
| Incorrect prerequisite graph | Bad recommendations | Trainer review, cycle detection, editable edges |
| Mastery score is misleading | Poor learning decisions | Label as estimate, use evidence history, calibrate model |
| Integrity signals have false positives | Unfair suspicion | Human review, contextual evidence, no automatic verdict |
| Sandbox escape or resource abuse | Infrastructure compromise | Hardened isolation, quotas, no secrets/host mounts, monitoring |
| Hidden tests are exposed | Assessment compromise | Server-side storage and restricted service access |
| LLM cost or latency | Slow or expensive workflows | Async jobs, caching approved content, quotas, smaller models where suitable |
| Large document extraction fails | Incomplete syllabus | File limits, OCR fallback, section-based processing, manual edit |
| Course changes affect historical scores | Confusing analytics | Version courses, questions, and assessments |
| Poor event connectivity | Incomplete replay | Client batching, sequence numbers, retry logic, completeness indicators |
| AI evaluation bias | Unfair viva scores | Rubrics, evidence-linked feedback, human review for uncertain/high-impact cases |

---

## 18. Suggested Delivery Plan

### Phase 1: Foundation
- Project setup and deployment.
- Authentication and role-based access.
- Database migrations and RLS.
- Course, module, concept, and prerequisite CRUD.
- Manual syllabus creation.

### Phase 2: Syllabus and learning content
- PDF/DOCX extraction.
- AI syllabus draft generation.
- Trainer approval workflow.
- Theory resources and AI-assisted explanation drafts.
- Concept map UI.

### Phase 3: Question bank and tests
- Question CRUD and concept mapping.
- Fixed quizzes and test series.
- Assessment attempts and scoring.
- AI question drafting and validation.

### Phase 4: Adaptivity
- Initial mastery service.
- Learning-attempt history.
- Prerequisite-aware recommendation engine.
- Student mastery dashboard.
- Trainer class analytics.

### Phase 5: Coding assessment
- Monaco Editor.
- Execution-service integration.
- Hidden test cases and execution statuses.
- Submission history and rate limits.

### Phase 6: Session integrity and viva
- Editor event capture.
- Replay timeline.
- Rule-based integrity signals.
- Evidence-linked trainer review.
- Code-specific viva questions and evaluation.

### Phase 7: Hardening and pilot
- Security review of sandbox and RLS.
- Functional, integration, and load tests.
- Accessibility and usability improvements.
- Monitoring, error handling, retention policies.
- Pilot feedback and calibration.

BKT, voice viva, DevOps labs, and repository evaluation should be scheduled after the end-to-end MVP is stable.

---

## 19. Open Decisions for Implementation

The following decisions must be finalized before production deployment:
1. Which programming languages are required for the MVP?
2. Will code execution use a hosted Judge0 provider or a self-hosted deployment?
3. Which LLM provider/model will be used, and what are the cost and data-retention constraints?
4. Which file types and maximum file sizes will syllabus import support?
5. What are the default assessment time limits, attempt policies, and mastery thresholds?
6. Which course roles can approve and publish content?
7. What are the retention periods for source code, editor events, submissions, and uploaded documents?
8. Will the MVP support voice responses or text only?
9. What is the policy for trainer review of low-confidence viva evaluations?
10. Which institution-specific curriculum formats must be supported?

Defaults should be documented in configuration and should not be hard-coded throughout the application.

---

## 20. Final Product Principle

The platform has three distinct responsibilities:

1. **The syllabus and concept graph define what a learner should know and which concepts depend on others.**
2. **The mastery model estimates what the learner currently understands from available evidence.**
3. **The recommendation engine chooses the next useful learning activity.**

AI assists with content creation and explanation, the sandbox evaluates code safely, and replayable evidence supports human review of assessment behavior. Trainers remain in control of the curriculum and consequential assessment decisions.

The MVP should prioritize a complete, reliable end-to-end learning loop over implementing every advanced feature at once.
