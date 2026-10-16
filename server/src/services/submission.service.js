import { getSupabase } from '../integrations/supabase.js';
import { env } from '../config/env.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';
import { executionService, checkExecutionRateLimit } from './execution.service.js';

// In-memory idempotency cache: key -> { sessionId, language, sourceCode, response, timestamp }
const idempotencyStore = new Map();

export const submissionService = {
  /**
   * Create a code submission and run all test cases (public + hidden) in isolated runner
   */
  async createSubmission({ sessionId, studentId, language, sourceCode, idempotencyKey }) {
    const supabase = getSupabase();

    // 1. Verify session exists and belongs to student
    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('You do not have permission to submit for this session.');
    }

    if (session.status === 'closed') {
      throw new ValidationError('Cannot submit code for a closed coding session.');
    }

    // 2. Validate payload language allowlist and byte size
    const { normalizedLang } = executionService.validatePayload({ language, sourceCode });

    // 3. Enforce rate limiting
    checkExecutionRateLimit(studentId);

    // 4. Handle idempotency key if provided
    if (idempotencyKey) {
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached) {
        if (
          cached.sessionId === sessionId &&
          cached.language === normalizedLang &&
          cached.sourceCode === sourceCode
        ) {
          return cached.response;
        }
        throw new ConflictError('Idempotency key reused with different submission payload.');
      }
    }

    // 5. Prevent unbounded duplicate executions: check if a submission is currently in-flight
    const { data: inFlightSubmissions = [] } = await supabase
      .from('submissions')
      .select('*')
      .eq('session_id', sessionId)
      .in('status', ['queued', 'running']);

    if (inFlightSubmissions && inFlightSubmissions.length > 0) {
      throw new ConflictError('A submission is currently executing for this coding session. Please wait.');
    }

    // 6. Create initial submission record in queued state
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        student_id: studentId,
        session_id: sessionId,
        attempt_id: session.attempt_id,
        question_version_id: session.question_version_id,
        language: normalizedLang,
        source_code: sourceCode,
        status: 'queued',
        score: 0,
        max_score: 0,
      })
      .select()
      .single();

    if (subError || !submission) {
      throw new Error('Failed to create submission record.');
    }

    // 7. Create execution job record
    const { data: job, error: jobError } = await supabase
      .from('execution_jobs')
      .insert({
        submission_id: submission.id,
        provider: env.JUDGE0_API_URL ? 'judge0' : 'isolated_runner',
        status: 'queued',
        limits: {
          timeLimitMs: 2000,
          memoryLimitMb: 256,
        },
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create execution job.');
    }

    // 8. Fetch all test cases (both public and hidden) for this question version
    const { data: allTestCases = [] } = await supabase
      .from('coding_test_cases')
      .select('*')
      .eq('question_version_id', session.question_version_id)
      .order('order_index', { ascending: true });

    // 9. Update state to running and execute in isolated runner
    await supabase.from('execution_jobs').update({ status: 'running' }).eq('id', job.id);
    await supabase.from('submissions').update({ status: 'running' }).eq('id', submission.id);

    const execResult = await executionService.executeTestCases({
      submissionId: submission.id,
      studentId,
      language: normalizedLang,
      sourceCode,
      testCases: allTestCases,
      limits: { timeLimitMs: 2000, memoryLimitMb: 256 },
    });

    // 10. Update terminal submission status and scores
    await supabase
      .from('submissions')
      .update({
        status: execResult.status,
        score: execResult.score,
        max_score: execResult.maxScore,
        completed_at: new Date().toISOString(),
      })
      .eq('id', submission.id);

    await supabase
      .from('execution_jobs')
      .update({
        status: 'succeeded',
        result_metadata: {
          status: execResult.status,
          score: execResult.score,
          maxScore: execResult.maxScore,
          passedTests: execResult.passedTests,
          totalTests: execResult.totalTests,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Update active session's current code and status
    await supabase
      .from('coding_sessions')
      .update({
        current_code: sourceCode,
        language: normalizedLang,
        status: 'submitted',
      })
      .eq('id', sessionId);

    const response = {
      submissionId: submission.id,
      executionJobId: job.id,
      status: execResult.status,
      score: execResult.score,
      maxScore: execResult.maxScore,
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        sessionId,
        language: normalizedLang,
        sourceCode,
        response,
        timestamp: Date.now(),
      });
    }

    return response;
  },

  /**
   * Get submission status and safe result summary
   */
  async getSubmissionById(submissionId, requestingUser) {
    const supabase = getSupabase();

    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (!submission) {
      throw new NotFoundError('Submission not found.');
    }

    const isOwner = submission.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this submission.');
    }

    return {
      id: submission.id,
      studentId: submission.student_id,
      sessionId: submission.session_id,
      attemptId: submission.attempt_id,
      questionVersionId: submission.question_version_id,
      language: submission.language,
      status: submission.status,
      score: submission.score,
      maxScore: submission.max_score,
      createdAt: submission.created_at,
      completedAt: submission.completed_at,
    };
  },

  /**
   * Get permitted test results for a submission with strict redaction of hidden tests
   */
  async getSubmissionResults(submissionId, requestingUser) {
    const supabase = getSupabase();

    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (!submission) {
      throw new NotFoundError('Submission not found.');
    }

    const isOwner = submission.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view these submission results.');
    }

    // Fetch test results recorded for this submission
    const { data: testResults = [] } = await supabase
      .from('test_results')
      .select('*')
      .eq('submission_id', submissionId);

    // Fetch test case metadata to correlate inputs and weights
    const { data: testCases = [] } = await supabase
      .from('coding_test_cases')
      .select('*')
      .eq('question_version_id', submission.question_version_id);

    const tcMap = new Map((testCases || []).map((tc) => [tc.id, tc]));
    const isStudent = requestingUser.role === 'student';

    const formattedResults = (testResults || []).map((tr) => {
      const tc = tcMap.get(tr.test_case_id);
      const isHidden = Boolean(tr.is_hidden || tc?.is_hidden);

      return {
        testCaseId: tr.test_case_id,
        status: tr.status,
        isHidden,
        runtimeMs: tr.runtime_ms,
        memoryBytes: tr.memory_bytes,
        pointsAwarded: tr.points_awarded,
        maxPoints: tc?.weight || 1,
        // STRICT CONFIDENTIALITY: Never return hidden test details to students
        input: isHidden && isStudent ? null : (tc?.input_payload || null),
        expectedOutput: isHidden && isStudent ? null : (tc?.expected_output || null),
        actualOutput: isHidden && isStudent ? null : (tr.actual_output || null),
        diagnostic: isHidden && isStudent ? null : (tr.diagnostic || null),
      };
    });

    return {
      submissionId: submission.id,
      status: submission.status,
      score: submission.score,
      maxScore: submission.max_score,
      passedTests: formattedResults.filter((r) => r.status === 'accepted').length,
      totalTests: formattedResults.length,
      testResults: formattedResults,
    };
  },

  /**
   * Poll execution job status
   */
  async getExecutionJobById(jobId, requestingUser) {
    const supabase = getSupabase();

    const { data: job } = await supabase
      .from('execution_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (!job) {
      throw new NotFoundError('Execution job not found.');
    }

    // Verify submission ownership
    const { data: submission } = await supabase
      .from('submissions')
      .select('student_id')
      .eq('id', job.submission_id)
      .maybeSingle();

    const isOwner = submission && submission.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this execution job.');
    }

    return {
      id: job.id,
      submissionId: job.submission_id,
      provider: job.provider,
      status: job.status,
      limits: job.limits,
      result: job.result_metadata,
      failureCode: job.failure_code,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    };
  },
};
