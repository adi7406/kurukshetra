# Backend Architecture & Implementation Guide — Pathwise

**Version:** 1.0.0  
**Last Updated:** October 2026  
**Stack:** Node.js, Express, PostgreSQL / Supabase, Piston / Judge0, Gemini API  

---

## 1. Directory Structure

The backend application is structured modularly under `server/src/`:

```
server/
├── .gitignore
├── package.json
└── src/
    ├── .env
    ├── app.js
    ├── server.js
    ├── controllers/
    │   ├── authController.js
    │   ├── curriculumController.js
    │   ├── assessmentController.js
    │   ├── progressController.js
    │   └── teacherController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── curriculumRoutes.js
    │   ├── assessmentRoutes.js
    │   ├── progressRoutes.js
    │   └── teacherRoutes.js
    ├── services/
    │   ├── authService.js
    │   ├── curriculumService.js
    │   ├── assessmentService.js
    │   ├── aiExtractionService.js
    │   ├── codeExecutionService.js
    │   └── bktService.js
    └── utils/
        ├── logger.js
        ├── response.js
        └── validators.js
```

---

## 2. Core Modules & Responsibilities

### 2.1 Entry Points
- `server.js`: Process bootstrapping, HTTP server lifecycle, port binding, and graceful shutdown signal handling (`SIGINT`, `SIGTERM`).
- `app.js`: Express application initialization, security middleware (`helmet`, `cors`), cookie parser, rate limiters, route mounting under `/api/v1`, and global error handler.

### 2.2 Controllers
- **`authController.js`**: Handles authentication sessions, teacher and student signups, universal evaluator access (`ID: demo` / `PASS: demo`), JWT issuance, and HTTP-only cookie management.
- **`curriculumController.js`**: Course listing, module hierarchy, concept retrieval, and syllabus ingestion dispatching.
- **`assessmentController.js`**: Quiz delivery, submission grading, coding challenge execution dispatching, test-case evaluation, and AI viva interrogation.
- **`progressController.js`**: Mastery recalculation using Bayesian Knowledge Tracing (BKT), next recommended activity engine, and concept breakdown.
- **`teacherController.js`**: Cohort roster metrics, class-wide bottleneck heatmap, pending approval queues, and intervention notes.

### 2.3 Services & Business Logic
- **`aiExtractionService.js`**: Integrates with Google Gemini API to parse uploaded syllabus PDFs or textual curricula into structured modules:
  - Technical text description
  - Diagram / ASCII conceptual illustration
  - Concrete executable code example
  - Minimum 5 Bloom-aligned quiz questions
  - Rigorous coding assessment with sample tests, hidden test suites, and viva questions.
- **`codeExecutionService.js`**: Sandboxed code execution engine communicating with Piston or Judge0 for Python, JavaScript, Java, and C++.
- **`bktService.js`**: Implements standard Bayesian Knowledge Tracing and exponential mastery updates ($\alpha = 0.15$) to prevent rapid oscillation and accurately reflect student capability.

---

## 3. Environment Configuration

The backend requires the following configuration in `server/src/.env`:

```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-jwt-secret

# AI Models & Processing
GEMINI_API_KEY=your-gemini-api-key

# Sandboxed Execution (Piston / Judge0)
PISTON_API_URL=https://emkc.org/api/v2/piston
```

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api/v1` (or `/api` in development):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user with ID/Password |
| `POST` | `/auth/signup/teacher` | Register verified instructor |
| `POST` | `/auth/signup/student` | Register enrolled student |
| `GET` | `/curriculum/courses` | List available curricula & courses |
| `POST` | `/curriculum/upload` | Ingest syllabus text/document via AI |
| `GET` | `/assessments/quizzes` | Fetch concept-targeted quizzes |
| `POST` | `/assessments/quizzes/submit` | Grade attempt and update mastery |
| `GET` | `/assessments/coding` | Fetch coding challenges |
| `POST` | `/assessments/coding/run` | Execute code against test suites |
| `POST` | `/assessments/coding/viva` | Evaluate verbal code defense |
| `GET` | `/progress/me` | Fetch active student mastery metrics |
| `GET` | `/teacher/dashboard` | Fetch instructor cohort health & queues |
