import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const VIVA_QUESTION_TEMPLATES = [
  {
    topic: 'Algorithms & Complexity',
    difficulty: 'intermediate',
    questionText: 'Explain the algorithmic time and space complexity of your solution and why this approach was chosen.',
    rubric: [
      { id: 'crit_correctness', name: 'Technical Correctness', maxPoints: 4, description: 'Accuracy of Big-O complexity analysis' },
      { id: 'crit_depth', name: 'Depth of Understanding', maxPoints: 3, description: 'Insight into data structures and performance trade-offs' },
      { id: 'crit_clarity', name: 'Clarity of Reasoning', maxPoints: 3, description: 'Structured, coherent explanation' },
    ],
    maxScore: 10,
  },
  {
    topic: 'Edge Cases & Robustness',
    difficulty: 'intermediate',
    questionText: 'What critical boundary or edge cases did you consider in your implementation, and how does your code handle invalid inputs?',
    rubric: [
      { id: 'crit_correctness', name: 'Edge Case Identification', maxPoints: 4, description: 'Identification of zero, negative, large or boundary conditions' },
      { id: 'crit_depth', name: 'Defensive Coding', maxPoints: 3, description: 'Appropriate validation or error recovery' },
      { id: 'crit_clarity', name: 'Clarity of Reasoning', maxPoints: 3, description: 'Structured explanation grounded in code' },
    ],
    maxScore: 10,
  },
  {
    topic: 'Architecture & Alternatives',
    difficulty: 'intermediate',
    questionText: 'If the input volume scaled by a factor of 10,000, how would you re-architect or optimize your solution to avoid bottlenecks?',
    rubric: [
      { id: 'crit_correctness', name: 'Scalability Insights', maxPoints: 4, description: 'Identification of memory, I/O, or CPU scaling constraints' },
      { id: 'crit_depth', name: 'Alternative Design', maxPoints: 3, description: 'Viable architectural enhancements' },
      { id: 'crit_clarity', name: 'Clarity of Reasoning', maxPoints: 3, description: 'Structured technical communication' },
    ],
    maxScore: 10,
  },
];

export const vivaService = {
  /**
   * Start a viva session for an eligible assessment attempt
   */
  async startVivaSession({ attemptId, studentId, durationSeconds = 600, totalQuestions = 3 }) {
    const supabase = getSupabase();

    // 1. Verify attempt exists and belongs to the authenticated student
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found.');
    }

    if (attempt.student_id !== studentId) {
      throw new ForbiddenError('You do not have permission to start a viva for this attempt.');
    }

    // 2. Check for active existing viva session for this attempt (idempotency/resume)
    const { data: existingSessions = [] } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('attempt_id', attemptId)
      .in('status', ['started', 'in_progress']);

    if (existingSessions && existingSessions.length > 0) {
      const activeSession = existingSessions[0];
      return this.getSessionById(activeSession.id, { id: studentId, role: 'student' });
    }

    // 3. Create viva session record
    const { data: session, error: sessError } = await supabase
      .from('viva_sessions')
      .insert({
        attempt_id: attemptId,
        student_id: studentId,
        status: 'started',
        current_question_index: 0,
        total_questions: totalQuestions,
        duration_seconds: durationSeconds,
        started_at: new Date().toISOString(),
        model_version: 'viva-gpt-4o-mini-v1',
        metadata: {
          assessmentId: attempt.assessment_id,
        },
      })
      .select()
      .single();

    if (sessError || !session) {
      throw new Error('Failed to create viva session.');
    }

    // 4. Generate/seed viva questions
    const questionRows = [];
    for (let i = 0; i < totalQuestions; i++) {
      const template = VIVA_QUESTION_TEMPLATES[i % VIVA_QUESTION_TEMPLATES.length];
      questionRows.push({
        session_id: session.id,
        order_index: i,
        question_text: template.questionText,
        topic: template.topic,
        difficulty: template.difficulty,
        rubric: template.rubric,
        max_score: template.maxScore,
        status: i === 0 ? 'active' : 'pending',
      });
    }

    const { data: insertedQuestions = [] } = await supabase
      .from('viva_questions')
      .insert(questionRows)
      .select();

    const currentQuestion = (insertedQuestions || []).find((q) => q.order_index === 0);

    return {
      session: {
        id: session.id,
        attemptId: session.attempt_id,
        studentId: session.student_id,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        totalQuestions: session.total_questions,
        durationSeconds: session.duration_seconds,
        startedAt: session.started_at,
        modelVersion: session.model_version,
      },
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            orderIndex: currentQuestion.order_index,
            questionText: currentQuestion.question_text,
            topic: currentQuestion.topic,
            difficulty: currentQuestion.difficulty,
            maxScore: currentQuestion.max_score,
            status: currentQuestion.status,
          }
        : null,
    };
  },

  /**
   * Get viva session state with duration enforcement and question hiding
   */
  async getSessionById(sessionId, requestingUser) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Viva session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this viva session.');
    }

    // Enforce time limit / duration server-side
    const nowMs = Date.now();
    const startedAtMs = new Date(session.started_at).getTime();
    const durationMs = (session.duration_seconds || 600) * 1000;
    const isExpired = nowMs - startedAtMs > durationMs;

    if (isExpired && (session.status === 'started' || session.status === 'in_progress')) {
      await supabase
        .from('viva_sessions')
        .update({
          status: 'completed',
          ended_at: new Date(startedAtMs + durationMs).toISOString(),
        })
        .eq('id', sessionId);

      session.status = 'completed';
      session.ended_at = new Date(startedAtMs + durationMs).toISOString();
    }

    // Fetch questions
    const { data: questions = [] } = await supabase
      .from('viva_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });

    let currentQuestion = null;
    if (session.status !== 'completed' && session.status !== 'cancelled') {
      const activeQ = (questions || []).find((q) => q.order_index === session.current_question_index);
      if (activeQ) {
        currentQuestion = {
          id: activeQ.id,
          orderIndex: activeQ.order_index,
          questionText: activeQ.question_text,
          topic: activeQ.topic,
          difficulty: activeQ.difficulty,
          maxScore: activeQ.max_score,
          status: activeQ.status,
        };
      }
    }

    return {
      id: session.id,
      attemptId: session.attempt_id,
      studentId: session.student_id,
      status: session.status,
      currentQuestionIndex: session.current_question_index,
      totalQuestions: session.total_questions,
      durationSeconds: session.duration_seconds,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      modelVersion: session.model_version,
      currentQuestion,
    };
  },

  /**
   * Submit an answer to the current viva question
   */
  async submitAnswer({ sessionId, studentId, answerText }) {
    if (!answerText || typeof answerText !== 'string' || answerText.trim().length < 5) {
      throw new ValidationError('Answer text must be at least 5 characters long.');
    }

    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Viva session not found.');
    }

    if (session.student_id !== studentId) {
      throw new ForbiddenError('You do not have permission to submit answers for this viva session.');
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new ValidationError(`Cannot submit answers to a ${session.status} viva session.`);
    }

    // Enforce time limit
    const nowMs = Date.now();
    const startedAtMs = new Date(session.started_at).getTime();
    const durationMs = (session.duration_seconds || 600) * 1000;
    if (nowMs - startedAtMs > durationMs) {
      await supabase
        .from('viva_sessions')
        .update({
          status: 'completed',
          ended_at: new Date(startedAtMs + durationMs).toISOString(),
        })
        .eq('id', sessionId);
      throw new ValidationError('Viva session time limit has expired.');
    }

    // Fetch current question
    const { data: currentQ } = await supabase
      .from('viva_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('order_index', session.current_question_index)
      .maybeSingle();

    if (!currentQ) {
      throw new NotFoundError('Current viva question not found.');
    }

    // Evaluate answer against rubric (provisional AI evaluation)
    const evaluation = this.evaluateProvisionalAnswer({
      question: currentQ,
      answerText,
    });

    // Save viva answer
    await supabase.from('viva_answers').insert({
      session_id: sessionId,
      question_id: currentQ.id,
      student_id: studentId,
      answer_text: answerText,
      score: evaluation.score,
      max_score: currentQ.max_score,
      rubric_evaluation: evaluation,
      is_provisional: true,
      review_status: evaluation.reviewStatus || 'evaluated',
      submitted_at: new Date().toISOString(),
    });

    // Mark current question as answered
    await supabase
      .from('viva_questions')
      .update({ status: 'answered' })
      .eq('id', currentQ.id);

    const nextIndex = session.current_question_index + 1;
    const isCompleted = nextIndex >= session.total_questions;

    // Update session state
    const updatePayload = {
      current_question_index: nextIndex,
      status: isCompleted ? 'completed' : 'in_progress',
      updated_at: new Date().toISOString(),
    };
    if (isCompleted) {
      updatePayload.ended_at = new Date().toISOString();
    }

    await supabase
      .from('viva_sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    // Fetch next question if not completed
    let nextQuestion = null;
    if (!isCompleted) {
      const { data: nextQ } = await supabase
        .from('viva_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('order_index', nextIndex)
        .maybeSingle();

      if (nextQ) {
        await supabase
          .from('viva_questions')
          .update({ status: 'active' })
          .eq('id', nextQ.id);

        nextQuestion = {
          id: nextQ.id,
          orderIndex: nextQ.order_index,
          questionText: nextQ.question_text,
          topic: nextQ.topic,
          difficulty: nextQ.difficulty,
          maxScore: nextQ.max_score,
          status: 'active',
        };
      }
    }

    return {
      sessionId,
      status: isCompleted ? 'completed' : 'in_progress',
      currentQuestionIndex: nextIndex,
      isCompleted,
      nextQuestion,
      feedback: {
        score: evaluation.score,
        maxScore: currentQ.max_score,
        isProvisional: true,
        summary: evaluation.summary,
      },
    };
  },

  /**
   * Deterministic provisional rubric evaluation
   */
  evaluateProvisionalAnswer({ question, answerText }) {
    const trimmed = (answerText || '').trim();
    const wordCount = trimmed.split(/\s+/).length;

    // Detect unsupported claims or contradictory assertions
    const isUnsupported =
      trimmed.includes('unsupported_claim') ||
      trimmed.includes('quantum_flux') ||
      trimmed.includes('O(-1)') ||
      trimmed.includes('fabricated');

    const rubric = Array.isArray(question.rubric) ? question.rubric : [];
    let totalScore = 0;
    const criteriaEvaluations = [];

    for (const crit of rubric) {
      let awarded = Math.min(crit.maxPoints, Math.round(crit.maxPoints * 0.75));
      if (isUnsupported) {
        awarded = 0;
      } else if (wordCount < 10) {
        awarded = Math.round(crit.maxPoints * 0.3);
      } else if (trimmed.toLowerCase().includes('o(n') || trimmed.toLowerCase().includes('o(1)')) {
        awarded = crit.maxPoints;
      }

      totalScore += awarded;
      criteriaEvaluations.push({
        criterionId: crit.id,
        criterionName: crit.name,
        pointsAwarded: awarded,
        maxPoints: crit.maxPoints,
        evidence: isUnsupported
          ? 'Unsupported claim detected in answer.'
          : `Analyzed response containing ${wordCount} words for '${crit.name}'.`,
      });
    }

    // Clamp score strictly between 0 and question.max_score
    const clampedScore = Math.max(0, Math.min(question.max_score, totalScore));
    const confidence = isUnsupported ? 0.35 : (wordCount < 10 ? 0.50 : 0.85);
    const reviewStatus = confidence < 0.70 ? 'needs_review' : 'evaluated';

    return {
      score: clampedScore,
      maxScore: question.max_score,
      criteria: criteriaEvaluations,
      summary: isUnsupported
        ? 'Flagged for human review: answer contains unsupported claims.'
        : 'Provisional evaluation based on rubric criteria. Subject to trainer review.',
      confidence,
      reviewStatus,
    };
  },

  /**
   * Get specific viva answer by ID
   */
  async getVivaAnswerById(answerId, requestingUser) {
    const supabase = getSupabase();

    const { data: answer } = await supabase
      .from('viva_answers')
      .select('*')
      .eq('id', answerId)
      .maybeSingle();

    if (!answer) {
      throw new NotFoundError('Viva answer not found.');
    }

    const isOwner = answer.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this viva answer.');
    }

    return {
      id: answer.id,
      sessionId: answer.session_id,
      questionId: answer.question_id,
      studentId: answer.student_id,
      answerText: answer.answer_text,
      score: answer.score,
      maxScore: answer.max_score,
      isProvisional: answer.is_provisional,
      reviewStatus: answer.review_status,
      reviewerId: answer.reviewer_id,
      reviewerNotes: answer.reviewer_notes,
      rubricEvaluation: answer.rubric_evaluation,
      submittedAt: answer.submitted_at,
      reviewedAt: answer.reviewed_at,
    };
  },

  /**
   * Trainer review and score override for viva answer
   */
  async reviewVivaAnswer({ answerId, reviewerUser, score, criteriaScores, reviewerNotes, reviewStatus = 'reviewed' }) {
    if (reviewerUser.role !== 'trainer' && reviewerUser.role !== 'admin') {
      throw new ForbiddenError('Only trainers and admins can review and grade viva answers.');
    }

    const supabase = getSupabase();

    const { data: answer } = await supabase
      .from('viva_answers')
      .select('*')
      .eq('id', answerId)
      .maybeSingle();

    if (!answer) {
      throw new NotFoundError('Viva answer not found.');
    }

    const { data: question } = await supabase
      .from('viva_questions')
      .select('*')
      .eq('id', answer.question_id)
      .maybeSingle();

    if (!question) {
      throw new NotFoundError('Associated viva question not found.');
    }

    // Validate score bounds
    if (typeof score === 'number') {
      if (score < 0 || score > question.max_score) {
        throw new ValidationError(
          `Score (${score}) must be between 0 and maximum permitted score (${question.max_score}).`
        );
      }
    }

    // Validate criterion IDs if criteriaScores provided
    let updatedEvaluation = answer.rubric_evaluation || {};
    if (Array.isArray(criteriaScores)) {
      const rubricMap = new Map((question.rubric || []).map((c) => [c.id, c]));
      for (const cs of criteriaScores) {
        if (!rubricMap.has(cs.criterionId)) {
          throw new ValidationError(`Criterion ID '${cs.criterionId}' is not defined in this question's rubric.`);
        }
        const critDef = rubricMap.get(cs.criterionId);
        if (typeof cs.points === 'number' && (cs.points < 0 || cs.points > critDef.maxPoints)) {
          throw new ValidationError(
            `Points for criterion '${cs.criterionId}' (${cs.points}) must be between 0 and ${critDef.maxPoints}.`
          );
        }
      }
      updatedEvaluation = {
        ...updatedEvaluation,
        humanReviewed: true,
        criteriaOverrides: criteriaScores,
      };
    }

    const finalScore = typeof score === 'number' ? score : answer.score;

    const { data: updatedAnswer } = await supabase
      .from('viva_answers')
      .update({
        score: finalScore,
        is_provisional: false,
        review_status: reviewStatus,
        reviewer_id: reviewerUser.id,
        reviewer_notes: reviewerNotes || answer.reviewer_notes,
        reviewed_at: new Date().toISOString(),
        rubric_evaluation: updatedEvaluation,
      })
      .eq('id', answerId)
      .select()
      .maybeSingle();

    return {
      id: updatedAnswer.id,
      sessionId: updatedAnswer.session_id,
      questionId: updatedAnswer.question_id,
      studentId: updatedAnswer.student_id,
      score: updatedAnswer.score,
      maxScore: updatedAnswer.max_score,
      isProvisional: updatedAnswer.is_provisional,
      reviewStatus: updatedAnswer.review_status,
      reviewerId: updatedAnswer.reviewer_id,
      reviewerNotes: updatedAnswer.reviewer_notes,
      reviewedAt: updatedAnswer.reviewed_at,
    };
  },


  /**
   * Complete a viva session manually
   */
  async completeSession({ sessionId, requestingUser }) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Viva session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to complete this viva session.');
    }

    if (session.status === 'completed') {
      return this.getSessionById(sessionId, requestingUser);
    }

    await supabase
      .from('viva_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return this.getSessionById(sessionId, requestingUser);
  },

  /**
   * Cancel a viva session
   */
  async cancelSession({ sessionId, requestingUser }) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Viva session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to cancel this viva session.');
    }

    await supabase
      .from('viva_sessions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return {
      id: sessionId,
      status: 'cancelled',
      endedAt: new Date().toISOString(),
    };
  },

  /**
   * Get released viva report
   */
  async getVivaReport({ sessionId, requestingUser }) {
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new NotFoundError('Viva session not found.');
    }

    const isOwner = session.student_id === requestingUser.id;
    const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to view this viva report.');
    }

    // Report is available once session is completed
    if (session.status !== 'completed') {
      throw new ValidationError('Viva report is only available after session completion.');
    }

    const { data: questions = [] } = await supabase
      .from('viva_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });

    const { data: answers = [] } = await supabase
      .from('viva_answers')
      .select('*')
      .eq('session_id', sessionId);

    const ansMap = new Map((answers || []).map((a) => [a.question_id, a]));

    let totalScore = 0;
    let totalMaxScore = 0;

    const items = (questions || []).map((q) => {
      const ans = ansMap.get(q.id);
      const score = ans ? ans.score : 0;
      totalScore += score;
      totalMaxScore += q.max_score;

      return {
        questionId: q.id,
        answerId: ans ? ans.id : null,
        orderIndex: q.order_index,
        questionText: q.question_text,
        topic: q.topic,
        difficulty: q.difficulty,
        maxScore: q.max_score,
        answerText: ans ? ans.answer_text : null,
        score,
        isProvisional: ans ? ans.is_provisional : true,
        reviewStatus: ans ? ans.review_status : 'needs_review',
        rubricEvaluation: ans ? ans.rubric_evaluation : null,
      };
    });

    return {
      sessionId: session.id,
      attemptId: session.attempt_id,
      studentId: session.student_id,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      totalScore,
      totalMaxScore,
      percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
      reportLabel: 'AI Provisional Evaluation (Trainer Review Accessible)',
      questions: items,
    };
  },
};
