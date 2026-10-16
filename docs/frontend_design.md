1. Purpose
This document defines the frontend experience and implementation direction for Pathwise, an adaptive learning and assessment portal. The interface should feel like a focused, professional learning workspace rather than a generic AI dashboard.
The first interaction is role-aware sign-in. Users sign in as a Student or Teacher. The server is the authority for the account role; the frontend must never grant a role based on a client-side selection alone.
The primary authenticated layout is a persistent left navigation sidebar, a compact top header, and a main content area.
2. Required application shell
2.1 Desktop layout
- Far-left sidebar: persistent primary navigation, approximately 240–256 px wide.
- Header: page context/title area on the left; a Home shortcut and profile menu aligned to the far right.
- Main area: flexible content region with consistent spacing and responsive page widths.
- Profile menu: clicking the profile/avatar icon opens a menu containing exactly:
  1. My profile
  2. Sign out
- Sign out: available in the profile menu. It ends the server session and returns the user to the sign-in screen.
- Do not add a second standalone Sign out button to the header when the profile menu already provides it.
- The header Home shortcut navigates to the role-appropriate home/overview route.
2.2 Sidebar navigation
The student-facing sidebar must show these destinations in this order:
1. Home
2. Dashboard
3. Content
   - Concepts (nested under Content)
4. Quiz
5. Code Assessments
6. Progress
Use clear Lucide icons beside labels. The selected route should have a restrained accent background, readable text, and a visible active indicator. Do not use emoji icons, pill-shaped navigation items, excessive rounding, or decorative gradients.
The user specified both Home and Dashboard. Keep both as separate destinations only if they have distinct purposes:
- Home: a concise landing/continue-learning view with the next recommended action and recent activity.
- Dashboard: a more detailed overview of enrolled courses, current learning activity, and summary information.
  If product implementation later combines these destinations, confirm that decision before removing either navigation item.
2.3 Role-aware navigation
The shared shell supports both Student and Teacher accounts. Render only routes that the signed-in role is authorized to use.
Student navigation
- Home
- Dashboard
- Content
  - Concepts
- Quiz
- Code Assessments
- Progress
Teacher navigation
- Home
- Dashboard
- Content
  - Concepts
- Quiz
- Code Assessments
- Progress
The labels requested for the student shell should remain consistent where possible. Teacher-specific actions should be added as clearly named, role-authorized destinations or actions when their workflows are implemented, such as course authoring, question review, learner management, and session review. Do not show nonfunctional links just to fill the sidebar.
Authorization rule: hiding a menu item is only a presentation decision. Every protected route and API request must still be authorized by the backend.
3. Authentication and first-use flow
3.1 Sign-in screen
The initial route is a clean sign-in page with:
- Pathwise wordmark/title and a concise description.
- Email field.
- Password field with show/hide control.
- Role selection for Student or Teacher, if the product requires users to select their intended workspace.
- Sign in button with idle, submitting, and error states.
- Invalid-credentials and service-error messages that do not reveal whether a particular email exists.
- A password-reset link only if password reset is implemented.
If the server returns the authenticated user's role, that role is authoritative. A selected role must not override the role stored for the account. If the selected workspace does not match the account role, show a clear message and do not create a session with altered permissions.
3.2 Login flow
1. User opens Pathwise and sees the sign-in screen when unauthenticated.
2. User enters credentials and chooses Student or Teacher if the UI includes role selection.
3. Frontend submits credentials through the shared API client.
4. Backend validates credentials and returns the authenticated user and authoritative role.
5. Frontend routes the user to the correct role-specific Home page.
6. On refresh, the frontend checks the existing session with the backend.
7. On sign out, the frontend calls the logout endpoint, clears client-side user state, and navigates to sign-in.
Do not store session identifiers in local storage. Prefer secure, HttpOnly, SameSite cookies configured by the backend.
4. Header and profile menu
Header layout
- Left: current page title or breadcrumb, depending on the page.
- Right: Home shortcut, then profile/avatar icon.
- Keep the header compact and aligned with the main content.
- Use a subtle bottom border rather than a heavy shadow.
- On narrow screens, preserve the Home shortcut where space allows and keep the profile menu accessible.
Profile menu interaction
Clicking the profile icon opens a small, accessible menu anchored to the icon. It contains:
My profile
- Opens the user's profile page.
- Shows the current user's name and email from the backend.
- Allows editing only fields supported by the backend.
- Do not expose or allow editing of protected role/permission fields.
Sign out
- Calls the backend logout endpoint.
- Shows a loading/disabled state while the request is in progress.
- On confirmed success, clears authenticated client state and routes to sign-in.
- If the request fails, show a clear error and avoid falsely claiming the session was ended.
The menu must support keyboard navigation, Escape to close, sensible focus handling, and accessible labels for icon-only controls.
5. Information architecture and route plan
Suggested routes; adapt names to the existing project without breaking working routes.
Route	Purpose	Access
/login	Sign-in	Public
/home	Role-aware landing/continue-learning page	Student, Teacher
/dashboard	Detailed overview	Student, Teacher
/content/concepts	Browse and open available concepts	Student, Teacher, with role-appropriate actions
/quiz	Quiz list and attempts	Student, Teacher, with role-appropriate actions
/code-assessments	Coding assessment list and workspace entry	Student, Teacher, with role-appropriate actions
/progress	Learning progress and evidence	Student; teacher views only when authorized
/profile	View/edit permitted profile fields	Authenticated users


A root route should check authentication and route appropriately:
- Unauthenticated: /login
- Authenticated student: /home
- Authenticated teacher: /home
Use a role-aware route guard. While session status is being checked, show a compact loading state rather than briefly rendering protected pages.
6. Existing repository and incremental implementation
The current repository uses this layout:
kurukshetra/
├── ai/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── docs/
└── server/
Implement the design inside the existing client application. Do not replace the repository structure or recreate the Vite app unnecessarily. Preserve the existing main.jsx, index.html, package configuration, and working integrations unless a change is necessary.
Recommended evolution of client/src:
src/
├── assets/
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── ProfileMenu.jsx
│   ├── ui/
│   └── feedback/
│       ├── LoadingState.jsx
│       ├── EmptyState.jsx
│       └── ErrorState.jsx
├── pages/
│   ├── auth/
│   │   └── LoginPage.jsx
│   ├── HomePage.jsx
│   ├── DashboardPage.jsx
│   ├── ConceptsPage.jsx
│   ├── QuizPage.jsx
│   ├── CodeAssessmentsPage.jsx
│   ├── ProgressPage.jsx
│   └── ProfilePage.jsx
├── hooks/
│   └── useAuth.js
├── services/
│   ├── apiClient.js
│   └── authService.js
├── utils/
├── App.jsx
├── App.css
├── index.css
└── main.jsx
This is a target structure, not a requirement to create empty files all at once. Add files as their functionality is implemented. Keep components small and reusable; avoid putting the entire application into App.jsx.
7. Visual design system
Direction
Use a restrained, professional palette with a light neutral canvas, white content surfaces, dark readable text, subtle borders, and one clear accent color. Use consistent alignment and purposeful whitespace.
Token	Value	Use
--background	#F7F8FA	Main canvas
--surface	#FFFFFF	Panels and menus
--surface-muted	#F1F3F5	Secondary areas
--text-primary	#20252B	Main text
--text-secondary	#626B75	Supporting text
--border	#DDE2E7	Dividers and outlines
--accent	#2457C5	Primary actions and selected navigation
--accent-hover	#1D469F	Accent hover
--success	#237A4B	Completed/approved states
--warning	#986000	Attention/review states
--danger	#B42318	Errors/destructive actions


Treat these as centralized CSS variables. Verify contrast against WCAG 2.2 AA. Do not communicate status through color alone.
Typography and spacing
- Use a readable system sans-serif stack; use Inter only if already available or straightforward to add.
- Page title: 26–30 px, semibold.
- Section title: 18–22 px, semibold.
- Body: 14–16 px; supporting text: 12–14 px.
- Use sentence case.
- Use a 4 px spacing scale.
- Desktop page gutters: 24–32 px; mobile: 16 px.
- Sidebar width: approximately 240–256 px.
- Header height: approximately 64–72 px.
- Use modest 6–10 px corner radii.
- Prefer subtle borders over strong shadows.
- Avoid purple gradients, glassmorphism, glowing borders, oversized decorative blobs, pill-shaped buttons, emoji icons, fake statistics, fake testimonials, and generic AI marketing copy.
8. Page-level design requirements
8.1 Home
Purpose: help the user decide what to do next.
Student view:
- A clear welcome/title.
- One primary action: Continue learning or Start diagnostic, based on real account state.
- Recommended next concept/activity, including the backend-provided reason when available.
- Recent activity, only when real data exists.
- A useful first-use empty state when no course or activity is available.
Teacher view:
- A concise overview of courses or content requiring attention.
- Relevant draft/review status and shortcuts to implemented teaching workflows.
- Useful empty state if no courses exist.
Do not fill the page with equal-sized statistic cards. The next useful action should be visually prominent.
8.2 Dashboard
Use this for a more detailed overview than Home.
Student:
- Enrolled courses and actual progress.
- Current learning activity.
- Upcoming or available quizzes and coding assessments.
- A compact summary of concept status.
- Recent attempts and results, subject to assessment policy.
Teacher:
- Courses and their actual publication status.
- Content awaiting review.
- Assessment activity and learner support needs where backend data exists.
- No invented learner counts, completion rates, or charts.
8.3 Content > Concepts
The sidebar item Content should expand/collapse and contain Concepts as a nested item. The Concepts page should:
- Show available courses/modules and their concepts.
- Support search/filter only when it is functional and backed by available data.
- Show concept title, learning objective or concise description when available, state, and action.
- Explain locked concepts using the actual prerequisite supplied by the backend.
- Let students open authorized learning content.
- Let teachers use only the authoring/editing actions permitted by their role and implemented backend.
The nested Concepts item should indicate the active state when the Concepts route is open. Parent Content should remain visually expanded for that route.
8.4 Quiz
- Show available quizzes, concept coverage, availability, attempt state, and due date only when one exists.
- Clearly distinguish not started, in progress, submitted, and result available.
- Quiz-taking view should focus on one question area with progress, supported navigation, answer controls, and submit action.
- Warn about unanswered questions before final submission where appropriate.
- Do not expose answer keys or hidden evaluation data.
- Show results and feedback only according to the backend's assessment policy.
8.5 Code Assessments
- Show available coding assessments and their status.
- Workspace layout on desktop: problem statement and constraints on the left, code editor on the right, output/run history in a bottom or collapsible panel.
- Use Monaco only on coding pages, loaded lazily.
- Separate Run code from Submit solution. Run output is not the official score.
- Preserve source code after compile/runtime errors.
- Distinguish wrong answer, compile error, runtime error, timeout, and execution-service failure.
- Never send hidden tests, expected outputs, reference solutions, or execution secrets to the browser.
- On mobile, use Problem, Editor, and Output tabs instead of forcing a three-pane layout.
- If session recording is enabled, disclose what is recorded, why, who can review it, and the retention policy before the assessment. Show recording status while active.
8.6 Progress
- Show actual concept-level progress and assessment history.
- Use only a few meaningful charts; provide a text/table alternative.
- Explain that mastery is an estimate based on available evidence.
- Display insufficient evidence distinctly from low mastery or failure.
- Do not label a person a “weak student” or imply that a mastery percentage is a precise measure of ability.
- Never let the frontend calculate official mastery or recommendation decisions.
8.7 My profile
- Show profile details returned by the backend.
- Allow edits only for supported fields.
- Keep role and permission details read-only.
- Provide clear save, saving, saved, and failure states.
- Do not add unsupported settings or nonfunctional controls.
9. Shared interaction patterns
Navigation
- Sidebar links navigate to actual routes.
- The Content parent expands/collapses; Concepts is nested beneath it.
- Active route and expanded parent are visually apparent.
- On mobile, use an accessible navigation drawer.
- Provide a collapse-to-icon-rail option on desktop only if implemented accessibly.
- No visible control should be decorative or inert.
Buttons and forms
- Primary button: one main action per page.
- Secondary button: safe supporting action.
- Destructive actions require confirmation when consequential.
- Persistent labels above form fields; do not rely on placeholders alone.
- Show inline validation and plain-language form errors.
- Preserve user input after recoverable errors.
- Disable repeat submission while a request is in progress and explain unavailable actions.
Loading, empty, error, and success states
Every data-driven page must support:
- Loading: layout-matched skeleton or compact loading state.
- Empty: explain what is missing and provide a relevant next action.
- Error: explain what failed and provide retry when safe.
- Success: confirm only after the server confirms the operation.
Never expose stack traces, SQL, provider payloads, tokens, hidden tests, or secrets to the user.
10. Responsive behavior and accessibility
Target WCAG 2.2 AA:
- Keyboard-operable navigation, menus, dialogs, and controls.
- Visible focus rings and semantic headings/landmarks.
- Accessible names for icon-only buttons.
- Persistent labels and programmatically associated field errors.
- Sufficient contrast and no color-only status indicators.
- Respect reduced-motion preferences.
- Support zoom to 200% without losing core functionality.
- Correct focus behavior for the profile menu and mobile drawer.
Breakpoints:
- Desktop: persistent sidebar and full content layout.
- Tablet: compact sidebar or drawer and reduced gutters.
- Mobile: drawer navigation, single-column pages, stacked forms, and mobile-friendly assessment tabs.
Do not hide essential actions on mobile.
11. Frontend architecture and API integration
Use React + Vite and JavaScript. Keep the current Vite setup and avoid introducing TypeScript. Use React Router for routes, Lucide icons for navigation, and existing styling conventions unless a deliberate migration is approved.
Use a shared API client and service modules rather than scattering network requests across page components. At minimum:
- apiClient.js: base URL, credentials/cookie behavior, JSON parsing, normalized errors.
- authService.js: login, current session, logout, profile retrieval/update.
- Additional course, concept, quiz, coding, and progress services as their APIs are implemented.
The frontend displays backend-owned decisions. It must not determine:
- Official quiz/coding scores.
- Hidden-test outcomes.
- Mastery or recommendation selection.
- Role permissions or resource ownership.
- Prerequisite readiness.
- Integrity outcomes or viva scores.
Treat uploaded documents, user input, source code, and model output as untrusted. Render generated text safely; do not render raw model HTML.
12. Security and privacy
- Never trust a role supplied by a form, URL, or local client state.
- Enforce permissions on the backend for every protected route and API.
- Keep LLM and code-execution secrets out of frontend code and VITE_* variables.
- Do not expose hidden tests, answer keys, reference solutions, reviewer notes, or other students' records.
- Avoid logging tokens, full source code, private test data, or unnecessary personal information.
- Explain session recording and retention before recording begins.
- Integrity signals are contextual evidence for human review, not proof of misconduct. Never automatically punish a student based on a signal.
13. Suggested implementation order
1. Foundation: design tokens, router, auth/session check, login, protected routes.
2. App shell: sidebar, nested Content > Concepts, header Home shortcut, profile menu, sign out.
3. Home and Dashboard: distinct purposes and real/empty states.
4. Concepts: browse concepts and open learning content.
5. Quiz: quiz list, attempt flow, result states.
6. Code Assessments: assessment list, lazy-loaded editor, run/submit states.
7. Progress: concept and assessment evidence.
8. Profile: backend-supported profile view/edit.
9. Hardening: role authorization, accessibility, mobile behavior, failure states, and data-leak checks.
Implement incrementally in the current repository. Do not rewrite unrelated files or install large libraries without a concrete need.
14. Acceptance checklist
Login and roles
- [ ] Unauthenticated users see the sign-in screen.
- [ ] Login routes according to the role returned by the backend.
- [ ] Student and Teacher views cannot be selected to bypass account permissions.
- [ ] Session state is checked on refresh.
- [ ] Sign out calls the backend and returns to sign-in after confirmed success.
Shell and navigation
- [ ] A persistent left sidebar contains Home, Dashboard, Content, nested Concepts, Quiz, Code Assessments, and Progress.
- [ ] Content expands/collapses and remains expanded on the Concepts route.
- [ ] Header Home shortcut is aligned on the far right.
- [ ] Profile icon is aligned at the far right of the header.
- [ ] Clicking the profile icon opens exactly My profile and Sign out.
- [ ] The profile menu is keyboard accessible and closes on Escape.
- [ ] Active navigation state is clear.
- [ ] Role-inaccessible routes are blocked by the backend, not merely hidden.
Quality
- [ ] No fake metrics, decorative buttons, purple gradients, pill-shaped buttons, or emoji icons.
- [ ] All data-driven pages have loading, empty, error, and success states where applicable.
- [ ] UI works at desktop, tablet, and mobile widths.
- [ ] Focus, labels, contrast, and keyboard navigation are tested.
- [ ] Official scores, mastery, permissions, and recommendation decisions come from the backend.
- [ ] Recording notices and incomplete-recording states are clear where recording is implemented.
15. Final design principle
Pathwise should make three things obvious:
1. Where am I?
2. What can I do next?
3. What evidence or status supports this decision?
Keep the requested left-side navigation and right-aligned header controls consistent across pages. Prefer a small number of polished, functional workflows over decorative screens. Distinguish backend-confirmed assessment results, mastery estimates, trainer-approved content, and human-reviewed integrity evidence.