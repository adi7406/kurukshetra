import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'go'];

export const STARTER_CODE_TEMPLATES = {
  javascript: `/**\n * Complete the function below\n */\nfunction solution() {\n  // Write your code here\n}\n`,
  python: `# Complete the function below\ndef solution():\n    # Write your code here\n    pass\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n`,
};

export const codingService = {
  /**
   * Start a new coding session for an eligible assessment and question
   */
  async startCodingSession({
    studentId,
    assessmentId,
    questionVersionId,
    language = 'javascript',
    attemptId = null,
    recordingConsent = 'v1',
  }) {
    const supabase = getSupabase();

    // 1. Validate configured language allowlist
    const normalizedLang = language.toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
      throw new ValidationError(
        `Language '${language}' is not supported. Configured languages: ${SUPPORTED_LANGUAGES.join(', ')}`
      );
    }

    // 2. Verify assessment and eligibility
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .maybeSingle();

    if (!assessment) {
      throw new NotFoundError('Assessment not found.');
    }

    // 3. Verify student enrollment in the course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', assessment.course_id)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle();

    if (!enrollment) {
      throw new ForbiddenError('You must be enrolled in the course to start a coding session.');
    }

    // 4. Verify question belongs to the assessment
    const { data: assessmentQuestions = [] } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId);

    const isQuestionInAssessment = (assessmentQuestions || []).some(
      (aq) => aq.question_version_id === questionVersionId
    );

    if (!isQuestionInAssessment) {
      throw new ValidationError('The specified question is not part of this assessment.');
    }

    // 5. Fetch question version and test cases
    const { data: qVersion } = await supabase
      .from('question_versions')
      .select('*')
      .eq('id', questionVersionId)
      .maybeSingle();

    if (!qVersion) {
      throw new NotFoundError('Question version not found.');
    }

    // Determine starter code: question metadata starter code or default template
    const starterCode =
      qVersion.metadata?.starterCode?.[normalizedLang] ||
      STARTER_CODE_TEMPLATES[normalizedLang] ||
      '// Write your code here\n';

    // 6. Fetch test cases (STRICT SECURITY: filter out hidden test cases)
    const { data: allTestCases = [] } = await supabase
      .from('coding_test_cases')
      .select('*')
      .eq('question_version_id', questionVersionId);

    const publicSampleTestCases = (allTestCases || [])
      .filter((tc) => tc.is_hidden === false)
      .map((tc) => ({
        id: tc.id,
        input: tc.input_payload,
        expectedOutput: tc.expected_output,
        orderIndex: tc.order_index,
      }));

    // Execution constraints
    const constraints = {
      timeLimitMs: qVersion.metadata?.timeLimitMs || 2000,
      memoryLimitMb: qVersion.metadata?.memoryLimitMb || 256,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };

    // 7. Create coding_session record
    const { data: session, error } = await supabase
      .from('coding_sessions')
      .insert({
        student_id: studentId,
        attempt_id: attemptId,
        question_version_id: questionVersionId,
        language: normalizedLang,
        current_code: starterCode,
        status: 'active',
        recording_consent_version: recordingConsent,
        started_at: new Date().toISOString(),
        last_event_sequence: 0,
        event_stream_complete: false,
      })
      .select()
      .single();

    if (error || !session) {
      throw new Error('Failed to create coding session.');
    }

    return {
      session: {
        id: session.id,
        studentId: session.student_id,
        attemptId: session.attempt_id,
        questionVersionId: session.question_version_id,
        language: session.language,
        status: session.status,
        startedAt: session.started_at,
        currentCode: session.current_code,
      },
      task: {
        prompt: qVersion.prompt,
        difficulty: qVersion.difficulty,
        marks: qVersion.marks,
        starterCode,
        constraints,
        sampleTestCases: publicSampleTestCases,
      },
    };
  },

  /**
   * Get coding session details with strict security redaction
   */
  async getSessionById(sessionId, requestingUser) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this coding session.');
    }

    // Fetch question metadata
    const { data: qVersion } = await supabase
      .from('question_versions')
      .select('*')
      .eq('id', session.question_version_id)
      .maybeSingle();

    // Fetch public sample test cases (never leak hidden tests)
    const { data: allTestCases = [] } = await supabase
      .from('coding_test_cases')
      .select('*')
      .eq('question_version_id', session.question_version_id);

    const publicSampleTestCases = (allTestCases || [])
      .filter((tc) => tc.is_hidden === false)
      .map((tc) => ({
        id: tc.id,
        input: tc.input_payload,
        expectedOutput: tc.expected_output,
        orderIndex: tc.order_index,
      }));

    return {
      id: session.id,
      studentId: session.student_id,
      attemptId: session.attempt_id,
      questionVersionId: session.question_version_id,
      language: session.language,
      currentCode: session.current_code,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      task: {
        prompt: qVersion?.prompt,
        difficulty: qVersion?.difficulty,
        sampleTestCases: publicSampleTestCases,
        constraints: {
          timeLimitMs: qVersion?.metadata?.timeLimitMs || 2000,
          memoryLimitMb: qVersion?.metadata?.memoryLimitMb || 256,
          supportedLanguages: SUPPORTED_LANGUAGES,
        },
      },
    };
  },

  /**
   * Save draft code for an active coding session
   */
  async saveDraft(sessionId, studentId, { code, language }) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('You can only save drafts to your own coding session.');
    }

    if (session.status !== 'active') {
      throw new ValidationError(`Cannot save draft: session is in '${session.status}' status.`);
    }

    const updates = {
      current_code: code,
      updated_at: new Date().toISOString(),
    };

    if (language) {
      const normalizedLang = language.toLowerCase();
      if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
        throw new ValidationError(`Language '${language}' is not supported.`);
      }
      updates.language = normalizedLang;
    }

    const { data: updated } = await supabase
      .from('coding_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    return {
      sessionId: updated.id,
      language: updated.language,
      currentCode: updated.current_code,
      updatedAt: updated.updated_at,
    };
  },

  /**
   * Close a coding session
   */
  async closeSession(sessionId, studentId) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('coding_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Coding session not found.');
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('You can only close your own coding session.');
    }

    const now = new Date().toISOString();
    const { data: updated } = await supabase
      .from('coding_sessions')
      .update({
        status: 'closed',
        ended_at: now,
        updated_at: now,
      })
      .eq('id', sessionId)
      .select()
      .single();

    return updated;
  },
};
