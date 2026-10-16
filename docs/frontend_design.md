# Frontend Design Specification

1. Design goal
Pathwise should feel like a credible, carefully designed learning and assessment workspace: calm, professional, practical, accessible, and focused on helping students learn. It must not look like a generic AI-generated dashboard or landing-page template.
Core principles
1. Learning first: make the next useful action obvious.
2. Trainer control: AI-generated content is a draft until reviewed and approved.
3. Explain decisions: tell students why content is recommended or locked.
4. Evidence over accusation: integrity signals are neutral evidence for human review, never proof of cheating.
5. Functional UI: no decorative buttons, fake charts, fake metrics, or tabs that do nothing.
6. Honest states: distinguish real data, missing data, estimated mastery, and infrastructure failures.
7. Accessible by default: keyboard navigation, visible focus, readable contrast, and reduced-motion support.
2. Frontend stack and implementation constraints
Use React + Vite, JavaScript only (no TypeScript), Tailwind CSS, shadcn/ui where useful, Lucide icons, React Router, Recharts, and Monaco Editor. Keep dependencies lean. Do not introduce a second UI framework without a clear need.
Suggested structure:
client/src/
  app/                 # App.jsx, router.jsx, providers.jsx
  components/
    layout/            # AppShell, Sidebar, Topbar, PageHeader, Breadcrumbs
    ui/                # shared controls
    feedback/          # LoadingState, EmptyState, ErrorState, StatusBadge
    courses/
    concepts/
    assessments/
    editor/
    mastery/
    replay/
  pages/
    auth/
    student/
    trainer/
    admin/
    shared/
  hooks/
  services/            # apiClient and domain API modules
  utils/
  styles/              # global styles and design tokens
Adapt to the existing repository rather than rebuilding unrelated files. Keep API calls out of page components where practical. Use a shared API client and separate services such as courseService.js, contentService.js, assessmentService.js, masteryService.js, codingService.js, and replayService.js.
The frontend must not independently determine official scores, hidden-test results, mastery, access permissions, prerequisite readiness, recommendation selection, integrity outcomes, or viva scores. Those decisions belong to the backend. The UI displays authoritative results returned by the server.
3. Visual system
Direction
Use a restrained neutral palette, one clear accent color, simple borders, strong alignment, and useful whitespace. Favor subtle borders over shadows. Avoid purple gradients, rainbow gradients, glassmorphism, glowing borders, oversized decorative blobs, pill-shaped buttons, emoji icons, and excessive rounded cards.
Initial color tokens
Token	Value	Use
--background	#F7F8FA	Main canvas
--surface	#FFFFFF	Cards and panels
--surface-muted	#F1F3F5	Subtle secondary areas
--text-primary	#20252B	Main text
--text-secondary	#626B75	Supporting text
--border	#DDE2E7	Dividers and outlines
--accent	#2457C5	Primary actions and selected navigation
--accent-hover	#1D469F	Primary hover state
--success	#237A4B	Passed, approved, completed
--warning	#986000	Attention and review required
--danger	#B42318	Errors and destructive actions
--info	#315E8A	Informational state


Treat these as centralized theme tokens, not colors to hard-code throughout components. Verify WCAG 2.2 AA contrast before release. Status must never be communicated through color alone.
Typography and spacing
- Use a readable system sans-serif stack; use Inter only if already available or easy to bundle.
- Page title: 26–30 px, semibold.
- Section heading: 18–22 px, semibold.
- Body: 14–16 px; supporting text: 12–14 px.
- Use sentence case, not all-caps labels.
- Use a 4 px spacing scale; desktop page gutters 24–32 px, mobile gutters 16 px.
- Panel padding 16–24 px; standard controls about 40 px high.
- Use 6–10 px corner radii. Avoid pill buttons and excessive rounding.
- Use Lucide icons consistently at 16–20 px. Do not use emoji as interface icons.
4. Information architecture
Student navigation
- Overview
- My courses
- Learning path
- Assessments
- Coding practice
- Progress
Account menu: Profile and preferences, Help, Sign out.
Trainer navigation
- Overview
- My courses
- Course authoring
- Question bank
- Assessments
- Learners
- Session reviews
Account menu: Profile and preferences, Help, Sign out.
Administrator navigation
- Overview
- Users and roles
- Courses
- Integrations and execution settings
- Audit and system health
Show only destinations the current role can access. Backend authorization remains mandatory even if the UI hides a route.
App shell
Desktop: a roughly 240 px sidebar, a compact top bar, and a flexible main content area. The sidebar may collapse to an icon rail. Keep a shared alignment grid and avoid unnecessary nested scrolling.
Tablet/mobile: use a drawer or compact navigation, stack forms, and adapt tables to a list or horizontal scroll. Do not force a desktop three-pane coding editor onto a phone; use Problem, Editor, and Output tabs on narrow screens.
5. Shared interaction patterns
Page headers
Each main page should have a clear title, breadcrumbs for nested views, a concise description only when useful, and at most one prominent primary action. Prefer direct labels such as Create course, Review generated questions, and Publish course. Avoid vague marketing copy.
Buttons
- Primary: one key action, e.g. Create course, Publish course, Submit solution.
- Secondary: Preview, Save draft, Cancel.
- Destructive: Archive course, Delete draft; confirm consequential actions.
- Inline/text: low-risk actions such as View details.
Labels must describe the outcome. Show a loading state and prevent duplicate submissions while requests are in progress. Do not disable a control without explaining why.
Forms
- Put persistent labels above fields; never rely on placeholders alone.
- Explain requirements and constraints near the field.
- Validate on blur or submit, not immediately before the user can interact.
- Preserve user input after recoverable errors.
- Use inline field errors and a form-level message for general failures.
- Group long forms into named sections and warn about unsaved changes when appropriate.
Tables and lists
Use consistent row heights, clear column alignment, restrained dividers, and useful filters. Provide search, sorting, and pagination only when relevant. Show active filters and a Clear filters action. Do not fill empty lists with fabricated records. Keep row actions predictable and accessible.
Status labels
Use compact text labels such as Draft, Generating, Needs review, Approved, Published, Archived, In progress, Completed, Passed, Failed, Timed out, Service unavailable, Recording incomplete, Reviewed, and Inconclusive.
Loading, empty, error, and success states
Every data-driven page must define these states:
- Loading: layout-matched skeletons; avoid full-screen spinners for ordinary reads.
- Empty: explain why the area is empty and offer the next relevant action. Example: “No courses yet. Create a course to start building your syllabus.”
- Error: explain what failed in plain language and offer retry when safe. Never expose stack traces, tokens, SQL, provider payloads, or hidden test data.
- Success: confirm only after the server confirms the operation. Link to the resulting resource when useful.
Use toasts for brief confirmations, not as the only place where important errors or review decisions appear. Use dialogs for consequential confirmations, not every small action.
6. Authentication and onboarding
Sign-in
Provide email and password fields, show/hide password, submit loading state, invalid-credentials feedback, and password reset only if implemented. Keep the page clean and centered with restrained branding, no giant promotional hero, and no decorative AI artwork.
After login, route using the role returned by the server. Never trust a role supplied in client form data or URL parameters.
First-use guidance
Students should be told how to select a course and complete a diagnostic. Trainers should be guided toward Create course and shown the syllabus → draft generation → review → publish process. Keep onboarding short and dismissible.
7. Student experience
7.1 Overview
Priority order:
1. Start diagnostic or Continue learning primary action.
2. Current courses with real progress data.
3. Recommended next activity, including concept and reason.
4. Recent assessment activity.
5. Compact concept mastery summary.
Do not build a dashboard from equal-sized statistic cards. The next learning action should be visually more prominent than secondary analytics.
A recommendation should show title, course/concept, activity type, level, estimated time only if defensible, backend-provided reason, and one action such as Start, Continue, or Review. Example copy: “Recommended because your last attempt showed that binary-search-tree deletion needs more practice.” Use actual backend context rather than hard-coded explanations.
7.2 Course catalogue and course page
Catalogue: search and relevant filters; show course title, short description, trainer, enrollment status, and actual course status. No fake ratings or student counts.
Course page: course overview, modules/concepts, access state, current activity, and mastery/completion indicators with explanations. A locked concept must explain the actual prerequisite, for example, Complete “Recursion basics” first.
7.3 Diagnostic assessment
Use a focused assessment layout: test title, progress, question count, timer if applicable, question area, answer controls, Previous/Next where allowed, and Submit assessment. Confirm before final submission if relevant and show unanswered questions.
Autosave where supported. Distinguish saving, saved, and save failed. Warn before leaving if unsaved answers may be lost. Do not expose answer keys or hidden tests. Fixed assessments must remain fixed unless their policy explicitly allows adaptivity.
7.4 Diagnostic results
Show the result permitted by policy, concept-level strengths and learning needs, an explanation that the result is an initial estimate, and the next recommended activity. Prefer Needs more practice, Developing, Ready for the next activity, and Not enough evidence yet. Never label a person a “weak student.”
7.5 Learning page
Use a reading-first layout: course/module/concept breadcrumbs, concept title and objective, readable theory, examples and diagrams near relevant text, key terms/common mistakes where available, and previous/next activity navigation. Provide a table of contents for long content. Keep core lessons usable without an AI chat feature. If personalized content is available, label it clearly, e.g. Foundational explanation.
7.6 Adaptive learning path
Use a readable sequence/list as the primary navigation and an interactive concept graph as an optional view. Each concept shows its name, state (Ready, In progress, Needs practice, Completed, Locked), mastery only where evidence is sufficient, prerequisite state, and available action. The graph must remain navigable when the course has many concepts and must have a list alternative.
7.7 Assessments and results
Assessment lists should show title, concept coverage, availability, attempt state, and due date only if one exists. Results should show score/status, permitted feedback, concept evidence, next step, and submission history where appropriate. For coding, distinguish wrong answer, compile error, runtime error, timeout, and infrastructure failure. Do not count infrastructure failure as an academic failure.
7.8 Progress
Use a small number of meaningful visualizations: selected-concept mastery trend, concept status breakdown, assessment history, and completed activities. Use real API data and include a text/table alternative. Label mastery as an estimate and make supporting evidence accessible.
8. Trainer experience
8.1 Overview
Prioritize course statuses, drafts awaiting review, relevant active/upcoming assessments, concepts with observed learning gaps, and recent learner activity. Use only authorized real data; otherwise show a useful empty state.
8.2 Course creation flow
Use a resumable stepper:
1. Course details
2. Syllabus source
3. Extract/generate structure
4. Review modules and concepts
5. Review prerequisites and objectives
6. Add/generate learning content
7. Add/generate assessments
8. Review readiness
9. Publish
Allow saving and resuming a draft. Do not require completion in one session.
8.3 Syllabus upload
Provide drag-and-drop plus file picker, accepted file types and size limits, filename/size, replace/remove action, and uploading/processing/completed/failed states. After extraction, show modules, concepts, objectives, source references where available, and low-confidence/ambiguous items. Allow inline edits. Distinguish content extracted from the document from AI-suggested content; do not imply an inferred prerequisite was explicitly stated in the source.
8.4 AI generation and review queue
Generation controls should allow target concepts, level (Beginner/Intermediate/Advanced), content type, quantity, and difficulty where supported. Show queued/generating/completed/rate-limited/failed states only as supported by the backend.
Review queue filters: Needs review, Approved, Rejected, All. Preview content alongside its source concept, level, validation results, and warnings. Actions: Edit, Regenerate, Approve, Reject. Batch approval must be limited to items that passed required checks and should require confirmation.
For coding tasks, show problem statement, constraints, examples, starter code by language, a trainer-only reference solution, proposed tests, validation results, and warnings for unvalidated solutions/tests. Never expose reference solutions or hidden tests in student-facing pages.
8.5 Concept and prerequisite editor
Use a module/concept list or tree plus a details panel. Fields include name, description, objectives, prerequisites, resources, assigned levels, linked assessments, and review/publication state. Offer a graph as a secondary view. Validate cycles and broken references before save/publish. Confirm changes that could affect existing content.
8.6 Question bank and assessment builder
Question bank filters: course/module/concept, type, difficulty, review status, source, and language for coding questions. Show linked concepts, difficulty, status, and last-updated date if available. Support view/edit/duplicate/archive while preserving canonical reusable question records.
Assessment builder: title/type, concept coverage, question selection, difficulty distribution, marks/timing, attempts, allowed coding languages, student preview, validation checklist, save draft, publish. Separate blocking errors from warnings. Block publication for missing questions, invalid keys, unvalidated coding tests, or required policy settings. Confirm publishing and show the published version only after server confirmation.
8.7 Learner analytics
Answer practical questions: which concepts are misunderstood, which learners need support, which questions may be ambiguous, how mastery is changing, and where evidence is insufficient. Filter by course/module/concept/assessment. Drill down only into authorized learner data. Avoid public leaderboards unless explicitly required.
8.8 Session review and replay
Use three coordinated regions:
1. Session header: learner, course, assessment, submission status, recording completeness.
2. Read-only Monaco replay with reconstructed code.
3. Timeline and evidence panel.
Controls: play/pause, seek, playback speed, previous/next event, jump to run/paste/submit/focus/visibility event or signal, and checkpoint comparison where available.
Each signal shows its type, timestamp/range, neutral explanation, linked events, jump-to-replay action, review status, and reviewer notes. Use wording such as Large insertion detected at 10:42, never Cheating detected. Clearly mark missing events and incomplete recordings. Explain that a visibility change does not identify which external app or website was opened. Review outcomes may include Reviewed — explainable, Inconclusive, and Follow-up needed. No one-click punishment based on a signal.
8.9 Code-viva review
Show submitted code, generated questions, student responses, rubric criteria, evaluation rationale, and uncertainty/review status. Feedback must relate to the actual implementation. Do not use fluency, accent, grammar, or response length as a proxy for technical understanding.
9. Coding assessment workspace
Desktop layout
- Header: assessment title, language selector, timer/status where applicable.
- Left pane: problem, examples, constraints, permitted hints.
- Right pane: Monaco Editor.
- Bottom/collapsible panel: Sample tests, Output, Run history, Submission result.
- Clear Run code and Submit solution actions.
Keep the editor and problem statement dominant. Use an adjustable split where practical. On narrow screens, use Problem/Editor/Output tabs.
Editor behavior
Use syntax highlighting and accessible shortcuts. Load only authorized starter code and problem information. Show saving/saved/failed states if draft autosave exists. Preserve code after errors. Make supported languages explicit. Do not load Monaco on unrelated pages.
Run versus submit
Run: execute against visible samples or permitted custom input and show output/compiler/runtime errors.
Submit: execute against private tests, calculate score on the backend, and save the official result.
Run flow: click Run code → show Running… → send code/language/question ID and permitted input to backend → backend validates and calls execution service → display safe output/status.
Submit flow: confirm if final/attempt-limited → backend validates ownership and assessment state → execute private tests → show safe summary/score according to policy → generate code-viva questions if configured → update mastery only after valid evidence is recorded.
Never send hidden test inputs, expected outputs, reference solutions, execution secrets, or privileged provider details to the browser. Distinguish accepted, wrong answer, compile error, runtime error, timeout, and service failure.
Recording notice
Before a recorded assessment, explain which editor events are captured, why, who may review them, and the retention policy. Record only assessment-relevant events. Show recording status while the session is active. Never claim a complete recording if events are missing.
10. Mastery and content-level UX
Trainer-authored content may have Beginner, Intermediate, and Advanced variants for each concept. Do not assign a permanent global level to a student. A student can be advanced in arrays and a beginner in recursion.
Suggested concept states: Not assessed, Needs foundational practice, Developing, Ready for the next activity, Advanced practice available, and Insufficient evidence. The backend defines thresholds; the frontend must not invent them.
Provide a tooltip/help panel explaining that mastery is an estimate based on recorded evidence and can change. Show evidence count/history where available. Avoid implying a percentage is a precise measure of ability.
When content is locked, explain why. When it becomes available, explain the prerequisite or mastery condition that enabled it. Never rely on hiding a button as the only access control.
11. Accessibility and responsive design
Target WCAG 2.2 AA:
- Keyboard-accessible controls and visible focus rings.
- Semantic headings and landmarks.
- Sufficient contrast for text, controls, and status.
- Programmatic labels and error associations.
- No color-only communication.
- Respect reduced-motion preferences.
- Support zoom to 200% without losing core functionality.
- Provide text/table alternatives for charts.
- Manage dialog focus and return focus to the invoking control.
- Give icon-only buttons accessible names.
Use Tailwind's existing breakpoints unless the project already defines a system. Mobile: single-column layouts and navigation drawer. Tablet: compact navigation and readable two-column layouts only when space allows. Desktop: full sidebar, multi-panel authoring, and split coding editor. Never hide essential actions on mobile.
12. Motion and microcopy
Motion should communicate state changes only: sidebar collapse, dialogs, expand/collapse, and subtle loading transitions. Avoid animated backgrounds, parallax, bouncing icons, and constant motion.
Preferred wording:
- Create course
- Upload syllabus
- Generate draft
- Review 12 questions
- Approve content
- Publish course
- Start diagnostic
- Continue learning
- Run code
- Submit solution
- View session replay
- Recording incomplete
Avoid vague phrases such as “Unlock your full potential,” “Let AI do the magic,” and “Supercharge your learning.” Do not say Cheating detected for a behavioral signal. Avoid identity labels such as weak student. Do not use em dashes in user-facing copy.
13. API integration and required UI states
Use service modules and a shared API client rather than scattering fetch calls across components. The client handles base URL, session/credential behavior, JSON parsing, normalized errors, cancellation where useful, and request IDs if supplied. Never put provider secrets in frontend environment variables.
Workflow	Required states
Authentication	idle, submitting, success, invalid credentials, service error
Syllabus upload	empty, uploading, processing, extracted, unsupported, failed
AI generation	idle, queued, generating, completed, rate limited, failed; partial only if supported
Content review	needs review, approved, rejected, saving, save failed
Publishing	validating, blocked with reasons, publishing, published, failed
Diagnostic	loading, in progress, saving, saved, save failed, submitted, expired
Coding run	idle, queued, running, compile error, runtime error, timeout, completed, service unavailable
Coding submission	confirming, submitting, queued, evaluating, result ready, rejected, failed
Replay	loading, ready, playing, paused, incomplete, unavailable
Integrity review	unreviewed, reviewed, inconclusive, follow-up needed
Mastery dashboard	loading, populated, no evidence, no data, error


Treat uploaded documents, user input, source code, and model output as untrusted. Render generated text safely; do not render raw model HTML. Preserve user input after recoverable failures. Do not treat external service timeouts as incorrect academic answers.
14. Performance expectations
- Lazy-load route-level pages and heavy modules such as Monaco.
- Avoid loading Monaco on pages that do not need it.
- Paginate or filter large question banks and learner lists on the server.
- Debounce search.
- Avoid unnecessary rerenders of Monaco and charts.
- Keep the rest of the app responsive while AI generation or code execution runs.
- Use supported job-status polling for long-running tasks and stop polling after a terminal state or navigation away.
- Cache only safe reusable data and invalidate it after relevant mutations.
- Test with realistic course sizes and coding sessions.
15. Frontend security
- Treat all user-generated and AI-generated content as untrusted.
- Never trust client-provided roles, ownership, scores, mastery, or publication status.
- Enforce permissions on the backend even if the UI hides controls.
- Never place LLM or Judge0 secrets in frontend code or VITE_* variables.
- Keep hidden tests, answer keys, reference solutions, reviewer notes, and other students' records out of student APIs.
- Avoid logging full source code, tokens, private test data, or unnecessary personal data to the browser console.
- Confirm destructive actions and guard against duplicate submissions.
- Keep recording notices and retention information clear.
16. UX acceptance checklist
Visual consistency
- [ ] Shared typography, color, spacing, controls, and status labels are consistent.
- [ ] Neutral palette and one accent color; no purple gradients, pill-shaped primary buttons, or emoji icons.
- [ ] No fake metrics, reviews, charts, or generic AI marketing copy.
- [ ] Each page has clear hierarchy and an obvious primary action.
Student workflows
- [ ] Student can select a course, take a diagnostic, view concept-level results, and start the recommended learning activity.
- [ ] Learning content is accessible before the next required assessment.
- [ ] Locked/recommended content explains why.
- [ ] Mastery is presented as an estimate, not a permanent learner label.
- [ ] Coding run output is distinct from official submission results.
Trainer workflows
- [ ] Trainer can create a course, upload a syllabus, review extracted concepts, and save a draft.
- [ ] AI-generated content is clearly marked as draft.
- [ ] Trainer can edit, approve, reject, and publish content.
- [ ] Coding test validation status is visible before publication.
- [ ] Integrity signals link to available replay evidence.
Reliability, accessibility, privacy
- [ ] Data-driven pages include loading, empty, error, and success states as appropriate.
- [ ] Failed requests preserve unsaved input.
- [ ] All visible controls work.
- [ ] Long-running jobs do not freeze the app.
- [ ] Keyboard navigation, focus, labels, and contrast are tested.
- [ ] Charts have text/table alternatives.
- [ ] Students are informed when session recording is enabled.
- [ ] Incomplete recordings are marked, and signals never automatically punish students.
- [ ] No hidden test data or privileged credentials reach the browser.
17. Implementation order
Slice 1: Foundation
App shell, role-based navigation, design tokens, shared components, authentication states, API client, error handling, responsive behavior.
Slice 2: Course authoring
Course list/create/edit, syllabus upload and processing states, concept/module editor, draft and approval states.
Slice 3: Student learning
Course catalogue, course page, diagnostic, results, lesson page, next activity, initial mastery/recommendation display.
Slice 4: Assessment authoring
Question bank, AI generation panel, review queue, assessment builder, validation.
Slice 5: Coding workspace
Monaco, problem statement, starter code, run/output panel, submit/results flow, infrastructure error handling.
Slice 6: Analytics and review
Student progress, trainer analytics, session replay, integrity review, code-viva evaluation.
Slice 7: Hardening
Accessibility, responsive behavior, API failure/retry testing, authorization/data-leak tests, performance, empty/loading/error state audit.
18. Final design rule
Pathwise should look and behave like a deliberately designed learning and assessment workspace, not a showcase of AI features. The interface should make three things clear:
1. What can I do here?
2. Why is this the next step?
3. What evidence or status supports this decision?
Prefer a smaller number of polished, working workflows over many decorative screens. Always distinguish AI-generated drafts, trainer-approved content, assessment results, mastery estimates, and human-reviewed integrity evidence.