import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors.js';
import { gradingService } from '../services/grading.service.js';
import { masteryService } from '../services/mastery.service.js';

export const attemptsController = {
  /**
   * Start a new assessment attempt (Enrolled student)
   */
  async startAttempt(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      // 1. Verify assessment exists and is published
      const { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();

      if (!assessment || assessment.status !== 'published') {
        throw new NotFoundError('Assessment not found or not currently available.');
      }

      // 2. Verify active enrollment in the course
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', assessment.course_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!enrollment) {
        throw new ForbiddenError('You must be actively enrolled in the course to attempt this assessment.');
      }

      // 3. Check attempt limit
      const { data: allAttempts = [] } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('student_id', user.id);

      const validAttempts = (allAttempts || []).filter((a) => a.status !== 'abandoned');
      if (validAttempts.length >= assessment.max_attempts) {
        throw new ForbiddenError(
          `Maximum attempt limit of ${assessment.max_attempts} reached for this assessment.`
        );
      }

      // 4. Calculate attempt number and expiration
      const attemptNumber = validAttempts.length + 1;
      const startedAt = new Date().toISOString();
      let expiresAt = null;

      if (assessment.duration_minutes) {
        const expDate = new Date(Date.now() + assessment.duration_minutes * 60 * 1000);
        expiresAt = expDate.toISOString();
      }

      const { data: newAttempt, error } = await supabase
        .from('assessment_attempts')
        .insert({
          assessment_id: assessmentId,
          student_id: user.id,
          attempt_number: attemptNumber,
          status: 'in_progress',
          result_metadata: {
            durationMinutes: assessment.duration_minutes,
            expiresAt,
          },
          started_at: startedAt,
        })
        .select()
        .single();

      if (error || !newAttempt) {
        throw new Error('Failed to start assessment attempt.');
      }

      res.status(201).json({
        data: {
          id: newAttempt.id,
          assessmentId: newAttempt.assessment_id,
          attemptNumber: newAttempt.attempt_number,
          status: newAttempt.status,
          startedAt: newAttempt.started_at,
          expiresAt,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get attempt details and saved answers
   */
  async getAttempt(req, res, next) {
    try {
      const { attemptId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        throw new NotFoundError('Attempt not found.');
      }

      const isPrivileged = user.role === 'trainer' || user.role === 'admin';
      if (!isPrivileged && attempt.student_id !== user.id) {
        throw new ForbiddenError('You do not have permission to view this attempt.');
      }

      // Fetch saved answers
      const { data: answers = [] } = await supabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      // Redact evaluation details if attempt is still in progress
      const safeAnswers = (answers || []).map((ans) => ({
        questionVersionId: ans.question_version_id,
        answer: ans.answer_payload,
        submittedAt: ans.submitted_at,
        // Only disclose grading if evaluated and attempt completed
        score: attempt.status === 'completed' ? ans.score : undefined,
        isCorrect: attempt.status === 'completed' ? ans.is_correct : undefined,
      }));

      res.status(200).json({
        data: {
          id: attempt.id,
          assessmentId: attempt.assessment_id,
          attemptNumber: attempt.attempt_number,
          status: attempt.status,
          startedAt: attempt.started_at,
          submittedAt: attempt.submitted_at,
          completedAt: attempt.completed_at,
          answers: safeAnswers,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Save or update an answer for an active attempt
   */
  async saveAnswer(req, res, next) {
    try {
      const { attemptId, questionId } = req.params;
      const { answer } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      if (!answer) {
        throw new ValidationError('Answer payload is required.');
      }

      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        throw new NotFoundError('Attempt not found.');
      }

      if (attempt.student_id !== user.id) {
        throw new ForbiddenError('You can only save answers to your own attempts.');
      }

      if (attempt.status !== 'in_progress') {
        throw new ConflictError(
          `Cannot save answers: attempt is in '${attempt.status}' state and is no longer active.`
        );
      }

      // Check if time limit has expired
      if (attempt.result_metadata?.expiresAt) {
        const expiresTime = new Date(attempt.result_metadata.expiresAt).getTime();
        if (Date.now() > expiresTime) {
          throw new ConflictError('Assessment duration has expired. Answers can no longer be saved.');
        }
      }

      // Verify question is part of the assessment
      const { data: mapping = [] } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', attempt.assessment_id);

      const isValidQuestion = (mapping || []).some((m) => m.question_version_id === questionId);
      if (!isValidQuestion) {
        throw new ValidationError(`Question version '${questionId}' does not belong to this assessment.`);
      }

      // Upsert answer into student_answers
      const { data: existingAnswers = [] } = await supabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attemptId)
        .eq('question_version_id', questionId);

      let savedAnswer;
      if (existingAnswers && existingAnswers.length > 0) {
        const { data: updated } = await supabase
          .from('student_answers')
          .update({
            answer_payload: answer,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existingAnswers[0].id)
          .select()
          .single();
        savedAnswer = updated;
      } else {
        const { data: created } = await supabase
          .from('student_answers')
          .insert({
            attempt_id: attemptId,
            question_version_id: questionId,
            answer_payload: answer,
            evaluation_status: 'pending',
          })
          .select()
          .single();
        savedAnswer = created;
      }

      res.status(200).json({
        data: {
          attemptId,
          questionVersionId: questionId,
          savedAt: savedAnswer.submitted_at || savedAnswer.created_at,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Finalize and submit an active attempt (Idempotent)
   */
  async submitAttempt(req, res, next) {
    try {
      const { attemptId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        throw new NotFoundError('Attempt not found.');
      }

      if (attempt.student_id !== user.id) {
        throw new ForbiddenError('You can only submit your own attempt.');
      }

      // Idempotent submission: if already submitted or completed, return current state
      if (['submitted', 'evaluating', 'completed'].includes(attempt.status)) {
        return res.status(200).json({
          data: {
            id: attempt.id,
            status: attempt.status,
            submittedAt: attempt.submitted_at,
            message: 'Attempt was already finalized.',
          },
          meta: {
            requestId: req.requestId,
          },
        });
      }

      const submittedAt = new Date().toISOString();

      const { data: finalized } = await supabase
        .from('assessment_attempts')
        .update({
          status: 'submitted',
          submitted_at: submittedAt,
        })
        .eq('id', attemptId)
        .select()
        .single();

      res.status(200).json({
        data: {
          id: finalized.id,
          status: finalized.status,
          submittedAt: finalized.submitted_at,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get attempt result and scoring breakdown (TASK-021)
   */
  async getAttemptResult(req, res, next) {
    try {
      const { attemptId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        throw new NotFoundError('Attempt not found.');
      }

      const isPrivileged = user.role === 'trainer' || user.role === 'admin';
      if (!isPrivileged && attempt.student_id !== user.id) {
        throw new ForbiddenError('You do not have permission to view this result.');
      }

      if (attempt.status === 'in_progress') {
        throw new ConflictError('Cannot view result while assessment attempt is still in progress.');
      }

      let result;
      if (attempt.status === 'submitted') {
        result = await gradingService.gradeAttempt(attemptId);
      } else {
        const { data: answers = [] } = await supabase
          .from('student_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        const percentage = attempt.max_score > 0 ? (Number(attempt.score) / Number(attempt.max_score)) * 100 : 0;
        result = {
          attemptId: attempt.id,
          assessmentId: attempt.assessment_id,
          status: attempt.status,
          score: Number(attempt.score),
          maxScore: Number(attempt.max_score),
          percentage: Math.round(percentage * 100) / 100,
          passed: attempt.passed,
          completedAt: attempt.completed_at || attempt.submitted_at,
          items: (answers || []).map((a) => ({
            questionVersionId: a.question_version_id,
            score: a.score,
            maxScore: a.max_score,
            isCorrect: a.is_correct,
            feedback: a.feedback,
          })),
        };
      }

      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List attempts for authenticated student
   */
  async listMyAttempts(req, res, next) {
    try {
      const user = req.user;
      const supabase = getSupabase();

      const { data: attempts = [] } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('student_id', user.id);

      res.status(200).json({
        data: attempts || [],
        meta: {
          requestId: req.requestId,
          count: (attempts || []).length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Process and ingest mastery evidence for an attempt (idempotent)
   */
  async processMasteryEvidence(req, res, next) {
    try {
      const { attemptId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (!attempt) {
        throw new NotFoundError('Attempt not found.');
      }

      // Check ownership or trainer/admin role
      if (attempt.student_id !== user.id && user.role !== 'trainer' && user.role !== 'admin') {
        throw new ForbiddenError('You can only process mastery evidence for your own attempts.');
      }

      if (attempt.status === 'submitted') {
        await gradingService.gradeAttempt(attemptId);
      }

      const result = await masteryService.processAttemptEvidence(attemptId);

      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Directly record a student attempt and update Bayesian knowledge tracing
   */
  async recordDirectAttempt(req, res, next) {
    try {
      const { conceptId, isSuccess } = req.body || {};
      const user = req.user;
      if (!conceptId) {
        throw new ValidationError('conceptId is required.');
      }
      const updatedMastery = await masteryService.updateMastery({
        studentId: user.id,
        conceptId,
        isCorrect: Boolean(isSuccess),
        evidenceType: 'diagnostic_quiz',
      });
      res.status(200).json({
        data: updatedMastery,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit quiz directly by assessmentId with answers payload (Direct Student Evaluation)
   */
  async submitQuizDirect(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const { answers = {} } = req.body || {};
      const user = req.user;
      const supabase = getSupabase();

      // Find assessment
      let { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();

      if (!assessment) {
        const { data: allA = [] } = await supabase.from('assessments').select('*');
        assessment = (allA || []).find((a) => a.id === assessmentId || assessmentId.includes(a.id));
      }

      // Fetch questions associated with this assessment
      const { data: allAq = [] } = await supabase.from('assessment_questions').select('*');
      const aqItems = (allAq || []).filter((aq) => !assessment || aq.assessment_id === assessment.id);
      const qvIds = aqItems.map((aq) => aq.question_version_id);

      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const { data: allOptions = [] } = await supabase.from('question_options').select('*');
      const { data: allAnswers = [] } = await supabase.from('question_answers').select('*');
      const { data: allMappings = [] } = await supabase.from('question_concepts').select('*');

      const versions = (allVersions || []).filter((v) => qvIds.includes(v.id) || (assessment && v.question_id === assessment.id));
      const questionsToGrade = versions.length > 0 ? versions : (allVersions || []).slice(0, 10);

      let correctCount = 0;
      const details = [];

      for (let idx = 0; idx < questionsToGrade.length; idx++) {
        const v = questionsToGrade[idx];
        const opts = (allOptions || []).filter((o) => o.question_version_id === v.id);
        const ansRow = (allAnswers || []).find((a) => a.question_version_id === v.id);

        let correctKey = null;
        if (ansRow?.answer_payload?.correctOptionIndex !== undefined) {
          correctKey = String(ansRow.answer_payload.correctOptionIndex);
        } else {
          const correctOpt = opts.find((o) => o.is_correct);
          correctKey = correctOpt ? String(correctOpt.option_key) : '0';
        }

        const studentAnswerKey = String(
          answers[v.id] ?? answers[v.question_id] ?? answers[String(idx)] ?? ''
        );

        const isCorrect = studentAnswerKey !== '' && (studentAnswerKey === correctKey || opts.find((o) => String(o.id) === studentAnswerKey)?.option_key === correctKey);

        if (isCorrect) correctCount++;

        const mapping = (allMappings || []).find((m) => m.question_version_id === v.id);
        if (mapping?.concept_id) {
          try {
            await masteryService.updateMastery({
              studentId: user.id,
              conceptId: mapping.concept_id,
              isCorrect,
              evidenceType: 'diagnostic_quiz',
            });
          } catch {
            // ignore
          }
        }

        details.push({
          questionId: v.id,
          prompt: v.prompt,
          selectedAnswer: studentAnswerKey,
          isCorrect,
          explanation: v.explanation || 'Diagnostic question evaluating concept invariant comprehension.',
        });
      }

      const totalCount = questionsToGrade.length || 1;
      const scorePercentage = Math.round((correctCount / totalCount) * 100);
      const passed = scorePercentage >= (assessment?.passing_percentage || 70);

      // Persist attempt
      const { data: attempt } = await supabase
        .from('assessment_attempts')
        .insert({
          assessment_id: assessment?.id || assessmentId,
          student_id: user.id,
          status: 'completed',
          score: correctCount,
          max_score: totalCount,
          passed,
          is_passing: passed,
          started_at: new Date(Date.now() - 300000).toISOString(),
          submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Update student profile overallMastery in metadata
      const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (currentProfile) {
        const prevMastery = currentProfile.metadata?.overallMastery || 40;
        const newOverall = Math.round((prevMastery + scorePercentage) / 2);
        await supabase
          .from('profiles')
          .update({
            metadata: {
              ...(currentProfile.metadata || {}),
              overallMastery: newOverall,
              lastQuizScore: scorePercentage,
              lastQuizDate: new Date().toISOString(),
            },
          })
          .eq('id', user.id);
      }

      const totalMarks = totalCount * 10;
      const marksEarned = correctCount * 10;

      res.status(200).json({
        success: true,
        data: {
          attemptId: attempt?.id,
          score: scorePercentage,
          marksEarned,
          totalMarks,
          correctCount,
          totalCount,
          passed,
          details,
        },
        score: scorePercentage,
        marksEarned,
        totalMarks,
        correctCount,
        totalCount,
        passed,
        details,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
