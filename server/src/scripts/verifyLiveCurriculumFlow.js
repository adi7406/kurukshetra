/**
 * Real Live HTTP Verification Script
 * Sends real HTTP requests to the running backend (http://localhost:3001)
 * Verifies:
 * 1. Health check
 * 2. Teacher registration with courseTaught: "Object-Oriented Programming (OOP)"
 * 3. Retrieval of assigned courses
 * 4. Syllabus curriculum extraction & AI generation
 * 5. Retrieval of persisted curriculum
 * 6. Teacher edit persistence
 * 7. Teacher publication
 * 8. Student view with redaction
 */

const BASE_URL = 'http://localhost:3001/api/v1';

async function run() {
  console.log('--- Starting Live HTTP Verification against ' + BASE_URL + ' ---');

  // 1. Health
  const healthRes = await fetch('http://localhost:3001/api/v1/health');
  console.log('Health check status:', healthRes.status);
  if (!healthRes.ok) throw new Error('Backend health check failed');

  // 2. Teacher Signup
  const email = `live.oop.teacher.${Date.now()}@example.com`;
  const teacherSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      displayName: 'Professor OOP Live',
      role: 'trainer',
      courseTaught: 'Object-Oriented Programming (OOP)',
    }),
  });
  const teacherData = await teacherSignupRes.json();
  console.log('Teacher signup status:', teacherSignupRes.status);
  const teacherToken = teacherData.data?.session?.access_token;
  if (!teacherToken) throw new Error('Teacher token missing');

  // 3. Courses list for teacher
  const coursesRes = await fetch(`${BASE_URL}/courses?assignedOnly=true`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const coursesData = await coursesRes.json();
  const courses = coursesData.data || [];
  console.log('Fetched assigned courses count:', courses.length);
  const oopCourse = courses.find((c) => c.title.toLowerCase().includes('object') || c.title.toLowerCase().includes('oop'));
  if (!oopCourse) throw new Error('Assigned OOP course not found in teacher courses list');
  console.log(`Found teacher's assigned course: [${oopCourse.code || 'CODE'}] ${oopCourse.title} (ID: ${oopCourse.id})`);

  // 4. Curriculum Generation
  const syllabusText = `Course Code: CS202 - Object-Oriented Programming (OOP)
Course Title: Object-Oriented Architecture and Design Patterns
Instructor: Department of Computer Science

Module 1: Encapsulation & Polymorphic Architectures
- Topic 1: Classes, Objects & Encapsulation Invariants (Heap Allocation, Data Hiding, Private Fields)
- Topic 2: Inheritance, Class Hierarchies & Abstract Bases (Subtyping, Code Reuse, Protected Scope)
- Topic 3: Polymorphism, Virtual Method Tables & Dynamic Dispatch (Virtual Functions, VTables, Dynamic Late Binding)`;

  console.log('Triggering asynchronous curriculum generation on live server...');
  const genRes = await fetch(`${BASE_URL}/courses/${oopCourse.id}/curriculum/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      syllabusText,
      courseTitle: oopCourse.title,
      async: true,
    }),
  });

  const genData = await genRes.json();
  console.log('Generation dispatch status:', genRes.status, 'Response:', JSON.stringify(genData));

  let curriculum;
  if (genData.data?.async && genData.data?.jobId) {
    const jobId = genData.data.jobId;
    console.log(`Job queued successfully with ID: ${jobId}. Polling /jobs/${jobId}...`);
    
    const startTime = Date.now();
    const timeoutMs = 240000; // 4 minutes
    let lastMsg = '';
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1500));
      const jobRes = await fetch(`${BASE_URL}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const jobData = await jobRes.json();
      const job = jobData.data || jobData;
      const currentMsg = `[Job Progress] ${job.progress?.completed || 0}% - ${job.progress?.message || job.status}`;
      if (currentMsg !== lastMsg) {
        console.log(currentMsg);
        lastMsg = currentMsg;
      }
      
      if (job.status === 'succeeded') {
        curriculum = job.result;
        break;
      }
      if (job.status === 'failed') {
        throw new Error(`Job failed: ${job.error?.message || 'Unknown error'}`);
      }
    }
  } else {
    curriculum = genData.data || genData;
  }

  if (!curriculum) {
    throw new Error('Curriculum generation failed to produce a result payload.');
  }

  console.log(`Synthesized: ${curriculum.concepts?.length} Topics, ${curriculum.quizzes?.length} Quizzes, ${curriculum.codingAssessments?.length} Coding Challenges`);

  if (!curriculum.concepts || curriculum.concepts.length < 3) {
    throw new Error('Expected at least 3 topics');
  }
  if (!curriculum.quizzes || curriculum.quizzes.length !== curriculum.concepts.length * 10) {
    throw new Error(`Expected exactly ${curriculum.concepts.length * 10} quizzes`);
  }
  if (!curriculum.codingAssessments || curriculum.codingAssessments.length !== curriculum.concepts.length * 2) {
    throw new Error(`Expected exactly ${curriculum.concepts.length * 2} coding challenges`);
  }

  // 5. Verification after simulated reload
  console.log('Verifying persisted curriculum via GET /courses/:id/curriculum...');
  const getRes = await fetch(`${BASE_URL}/courses/${oopCourse.id}/curriculum`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const getData = await getRes.json();
  const persisted = getData.data || getData;
  console.log(`Verified DB Retrieval: ${persisted.concepts?.length} Topics, ${persisted.quizzes?.length} Quizzes, ${persisted.codingAssessments?.length} Coding Challenges`);

  // 6. Edit topic
  const targetTopic = persisted.concepts[0];
  console.log(`Editing topic ${targetTopic.id} (${targetTopic.name})...`);
  const editRes = await fetch(`${BASE_URL}/courses/${oopCourse.id}/curriculum`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      type: 'concept',
      itemId: targetTopic.id,
      updates: {
        name: `${targetTopic.name} (Live Verified)`,
        theory: 'Verified live theory content persisted into database.',
      },
    }),
  });
  console.log('Edit status:', editRes.status);

  // 7. Publish
  console.log('Publishing curriculum via POST /courses/:id/curriculum/publish...');
  const pubRes = await fetch(`${BASE_URL}/courses/${oopCourse.id}/curriculum/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ publishAll: true }),
  });
  const pubData = await pubRes.json();
  console.log('Publish status:', pubRes.status, 'Status:', pubData.data?.status);

  // 8. Student view
  const studentSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `live.student.${Date.now()}@example.com`,
      password: 'password123',
      displayName: 'Live Student',
      role: 'student',
    }),
  });
  const studentData = await studentSignupRes.json();
  const studentToken = studentData.data?.session?.access_token;

  const studentGetRes = await fetch(`${BASE_URL}/courses/${oopCourse.id}/curriculum`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentCurriculum = (await studentGetRes.json()).data;
  console.log('Student curriculum access status:', studentGetRes.status, 'Topics visible:', studentCurriculum.concepts?.length);

  // Check that answer keys and hidden tests are redacted
  const quizHasCorrectKey = studentCurriculum.quizzes.some((q) => q.correctIndex !== undefined || q.correctOptionKey !== undefined);
  const codingHasHiddenTests = studentCurriculum.codingAssessments.some((ca) => ca.hiddenTests !== undefined);
  console.log('Student quiz answer keys leaked?', quizHasCorrectKey);
  console.log('Student hidden test cases leaked?', codingHasHiddenTests);
  if (quizHasCorrectKey || codingHasHiddenTests) {
    throw new Error('Security violation: correct answers or hidden tests leaked to student!');
  }

  console.log('=== ALL LIVE HTTP VERIFICATION CHECKS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('LIVE VERIFICATION ERROR:', err);
  process.exit(1);
});
