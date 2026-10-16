import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';

export const questionsController = {
  /**
   * List questions for a course (Trainer/Admin only)
   */
  async listQuestions(req, res, next) {
    try {
      const { courseId } = req.params;
      const { conceptId, questionType, difficulty } = req.query;
      const supabase = getSupabase();

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Fetch all questions for course
      const { data: allQuestions = [] } = await supabase.from('questions').select('*').eq('course_id', courseId);
      const questionIds = (allQuestions || []).map((q) => q.id);

      // Fetch latest question versions
      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const filteredVersions = (allVersions || []).filter((v) => questionIds.includes(v.question_id));

      // Group by question_id and select the highest version_number
      const latestVersionMap = new Map();
      for (const v of filteredVersions) {
        const existing = latestVersionMap.get(v.question_id);
        if (!existing || v.version_number > existing.version_number) {
          latestVersionMap.set(v.question_id, v);
        }
      }

      let results = Array.from(latestVersionMap.values());

      if (questionType) {
        results = results.filter((r) => r.question_type === questionType);
      }
      if (difficulty) {
        results = results.filter((r) => r.difficulty === difficulty);
      }
      if (conceptId) {
        const { data: mappedConcepts = [] } = await supabase.from('question_concepts').select('*').eq('concept_id', conceptId);
        const mappedVersionIds = (mappedConcepts || []).map((m) => m.question_version_id);
        results = results.filter((r) => mappedVersionIds.includes(r.id));
      }

      res.status(200).json({
        data: results,
        meta: {
          requestId: req.requestId,
          count: results.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create question with initial immutable version, options, answers, and test cases
   */
  async createQuestion(req, res, next) {
    try {
      const { courseId } = req.params;
      const {
        questionType,
        title,
        prompt,
        difficulty = 'intermediate',
        marks = 1,
        negativeMarks = 0,
        explanation = null,
        conceptIds = [],
        options = [],
        answer = null,
        testCases = [],
        reviewStatus = 'approved',
      } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Check for duplicate prompt within course (TASK-017)
      const { data: existingCourseQuestions = [] } = await supabase
        .from('questions')
        .select('*')
        .eq('course_id', courseId);
      const existingQIds = (existingCourseQuestions || []).map((q) => q.id);

      if (existingQIds.length > 0) {
        const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
        const courseVersions = (allVersions || []).filter((v) => existingQIds.includes(v.question_id));
        const duplicate = courseVersions.find(
          (v) => v.prompt && v.prompt.trim().toLowerCase() === prompt.trim().toLowerCase()
        );
        if (duplicate) {
          throw new ConflictError('A question with an identical prompt already exists in this course.');
        }
      }

      // Validate answer key integrity (TASK-017)
      if (['mcq_single', 'mcq_multiple'].includes(questionType)) {
        if (!Array.isArray(options) || options.length < 2) {
          throw new ValidationError('Multiple choice questions must have at least 2 options.');
        }
        const hasCorrectOption = options.some((opt) => opt.isCorrect);
        const hasAnswerPayload =
          answer?.payload?.correctOptionKey || (Array.isArray(answer?.payload?.selectedOptionKeys) && answer.payload.selectedOptionKeys.length > 0);
        if (!hasCorrectOption && !hasAnswerPayload) {
          throw new ValidationError('Objective questions must specify a valid answer key or at least one correct option.');
        }
      }

      // 1. Create stable question identity
      const { data: question, error: qErr } = await supabase
        .from('questions')
        .insert({
          course_id: courseId,
          created_by: user.id,
        })
        .select()
        .single();

      if (qErr || !question) {
        throw new Error('Failed to create question identity.');
      }

      // 2. Create version 1
      const { data: version, error: vErr } = await supabase
        .from('question_versions')
        .insert({
          question_id: question.id,
          version_number: 1,
          question_type: questionType,
          title,
          prompt,
          difficulty,
          marks,
          negative_marks: negativeMarks,
          explanation,
          review_status: reviewStatus,
          created_by: user.id,
        })
        .select()
        .single();

      if (vErr || !version) {
        throw new Error('Failed to create question version.');
      }

      // 3. Map concepts
      if (Array.isArray(conceptIds) && conceptIds.length > 0) {
        const rows = conceptIds.map((cId) => ({
          question_version_id: version.id,
          concept_id: cId,
        }));
        await supabase.from('question_concepts').insert(rows);
      }

      // 4. Save options (for objective questions)
      if (Array.isArray(options) && options.length > 0) {
        const optRows = options.map((opt, idx) => ({
          question_version_id: version.id,
          option_key: opt.key || String.fromCharCode(65 + idx),
          option_text: opt.text,
          order_index: opt.orderIndex ?? idx,
          is_correct: Boolean(opt.isCorrect),
        }));
        await supabase.from('question_options').insert(optRows);
      }

      // 5. Save protected answers (Inaccessible to learners)
      if (answer) {
        await supabase.from('question_answers').insert({
          question_version_id: version.id,
          answer_type: answer.type || questionType,
          answer_payload: answer.payload,
          evaluation_config: answer.evaluationConfig || {},
        });
      }

      // 6. Save coding test cases
      if (Array.isArray(testCases) && testCases.length > 0) {
        const tcRows = testCases.map((tc, idx) => ({
          question_version_id: version.id,
          input_payload: tc.input,
          expected_output: tc.expectedOutput,
          is_hidden: tc.isHidden !== undefined ? tc.isHidden : true,
          weight: tc.weight || 1.0,
          time_limit_ms: tc.timeLimitMs || 2000,
          memory_limit_mb: tc.memoryLimitMb || 256,
          order_index: tc.orderIndex ?? idx,
        }));
        await supabase.from('coding_test_cases').insert(tcRows);
      }

      res.status(201).json({
        data: {
          id: question.id,
          courseId,
          versionId: version.id,
          versionNumber: 1,
          questionType,
          title,
          prompt,
          difficulty,
          marks,
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
   * Get question by ID with strict role-based data redaction.
   * Learners: NEVER receive correct answers, answer keys, rubrics, or hidden test cases.
   * Trainers: Receive full question data including protected answers and hidden tests.
   */
  async getQuestionById(req, res, next) {
    try {
      const { questionId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      // Look up stable question
      const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle();
      if (!question) {
        throw new NotFoundError('Question not found.');
      }

      // Find latest version
      const { data: allVersions = [] } = await supabase
        .from('question_versions')
        .select('*')
        .eq('question_id', questionId);

      if (!allVersions || allVersions.length === 0) {
        throw new NotFoundError('Question version not found.');
      }

      // Sort descending by version_number to find the active/latest version
      const sorted = [...allVersions].sort((a, b) => b.version_number - a.version_number);
      const version = sorted[0];

      // Fetch options
      const { data: options = [] } = await supabase
        .from('question_options')
        .select('*')
        .eq('question_version_id', version.id);

      // Fetch test cases
      const { data: allTestCases = [] } = await supabase
        .from('coding_test_cases')
        .select('*')
        .eq('question_version_id', version.id);

      const isPrivileged = user.role === 'trainer' || user.role === 'admin';

      // Redact sensitive data for students
      const sanitizedOptions = (options || []).map((o) => {
        if (!isPrivileged) {
          // STRICT SECURITY: Remove is_correct flag for student caller
          const { is_correct: _removed, ...safeOption } = o;
          return safeOption;
        }
        return o;
      });

      // Filter test cases: Students see ONLY public sample tests
      const visibleTestCases = (allTestCases || [])
        .filter((tc) => isPrivileged || !tc.is_hidden)
        .map((tc) => {
          if (!isPrivileged) {
            // Strip internal details if any
            return {
              id: tc.id,
              input: tc.input_payload,
              expectedOutput: tc.expected_output,
              isHidden: false,
              orderIndex: tc.order_index,
            };
          }
          return tc;
        });

      let answerData = null;
      if (isPrivileged) {
        const { data: ans } = await supabase
          .from('question_answers')
          .select('*')
          .eq('question_version_id', version.id)
          .maybeSingle();
        answerData = ans;
      }

      const responsePayload = {
        id: question.id,
        courseId: question.course_id,
        versionId: version.id,
        versionNumber: version.version_number,
        questionType: version.question_type,
        title: version.title,
        prompt: version.prompt,
        difficulty: version.difficulty,
        marks: version.marks,
        negativeMarks: version.negative_marks,
        options: sanitizedOptions,
        sampleTestCases: visibleTestCases,
        // Only include explanation/answers if trainer or released
        explanation: isPrivileged ? version.explanation : null,
        answer: answerData ? { payload: answerData.answer_payload, type: answerData.answer_type } : null,
      };

      res.status(200).json({
        data: responsePayload,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update question by creating an immutable new version (Trainer/Admin)
   */
  async updateQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const { title, prompt, difficulty, marks, explanation, options, answer } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle();
      if (!question) {
        throw new NotFoundError('Question not found.');
      }

      if (question.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to modify this question.');
      }

      // Fetch latest version
      const { data: allVersions = [] } = await supabase
        .from('question_versions')
        .select('*')
        .eq('question_id', questionId);

      const sorted = [...(allVersions || [])].sort((a, b) => b.version_number - a.version_number);
      const latest = sorted[0];
      const nextVersionNumber = (latest ? latest.version_number : 0) + 1;

      // Create new immutable version
      const { data: newVersion, error: vErr } = await supabase
        .from('question_versions')
        .insert({
          question_id: question.id,
          version_number: nextVersionNumber,
          question_type: latest ? latest.question_type : 'mcq_single',
          title: title !== undefined ? title : latest.title,
          prompt: prompt !== undefined ? prompt : latest.prompt,
          difficulty: difficulty !== undefined ? difficulty : latest.difficulty,
          marks: marks !== undefined ? marks : latest.marks,
          negative_marks: latest ? latest.negative_marks : 0,
          explanation: explanation !== undefined ? explanation : latest.explanation,
          review_status: 'approved',
          created_by: user.id,
        })
        .select()
        .single();

      if (vErr || !newVersion) {
        throw new Error('Failed to create new question version.');
      }

      // If new options provided, save for new version
      if (Array.isArray(options) && options.length > 0) {
        const optRows = options.map((opt, idx) => ({
          question_version_id: newVersion.id,
          option_key: opt.key || String.fromCharCode(65 + idx),
          option_text: opt.text,
          order_index: opt.orderIndex ?? idx,
          is_correct: Boolean(opt.isCorrect),
        }));
        await supabase.from('question_options').insert(optRows);
      }

      // If new answer provided, save for new version
      if (answer) {
        await supabase.from('question_answers').insert({
          question_version_id: newVersion.id,
          answer_type: answer.type || newVersion.question_type,
          answer_payload: answer.payload,
          evaluation_config: answer.evaluationConfig || {},
        });
      }

      res.status(200).json({
        data: {
          id: question.id,
          versionId: newVersion.id,
          versionNumber: newVersion.version_number,
          title: newVersion.title,
          prompt: newVersion.prompt,
          difficulty: newVersion.difficulty,
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
   * Publish a draft question (Trainer/Admin)
   */
  async publishQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle();
      if (!question) {
        throw new NotFoundError('Question not found.');
      }

      if (question.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to publish this question.');
      }

      const { data: allVersions = [] } = await supabase
        .from('question_versions')
        .select('*')
        .eq('question_id', questionId);

      const sorted = [...(allVersions || [])].sort((a, b) => b.version_number - a.version_number);
      const latest = sorted[0];

      if (!latest) {
        throw new NotFoundError('Question version not found.');
      }

      const { data: updated } = await supabase
        .from('question_versions')
        .update({
          review_status: 'approved',
        })
        .eq('id', latest.id)
        .select()
        .single();

      res.status(200).json({
        data: {
          id: question.id,
          versionId: updated.id,
          versionNumber: updated.version_number,
          reviewStatus: updated.review_status,
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
   * Preview a question with all answers, test cases, and explanation (Trainer/Admin only)
   */
  async previewQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      if (user.role !== 'trainer' && user.role !== 'admin') {
        throw new ForbiddenError('Only trainers and admins can access question previews.');
      }

      const { data: question } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle();
      if (!question) {
        throw new NotFoundError('Question not found.');
      }

      const { data: allVersions = [] } = await supabase
        .from('question_versions')
        .select('*')
        .eq('question_id', questionId);

      const sorted = [...(allVersions || [])].sort((a, b) => b.version_number - a.version_number);
      const latest = sorted[0];

      if (!latest) {
        throw new NotFoundError('Question version not found.');
      }

      const { data: options = [] } = await supabase
        .from('question_options')
        .select('*')
        .eq('question_version_id', latest.id);

      const { data: answer } = await supabase
        .from('question_answers')
        .select('*')
        .eq('question_version_id', latest.id)
        .maybeSingle();

      const { data: testCases = [] } = await supabase
        .from('coding_test_cases')
        .select('*')
        .eq('question_version_id', latest.id);

      res.status(200).json({
        data: {
          id: question.id,
          versionId: latest.id,
          versionNumber: latest.version_number,
          questionType: latest.question_type,
          prompt: latest.prompt,
          difficulty: latest.difficulty,
          marks: latest.marks,
          reviewStatus: latest.review_status,
          explanation: latest.explanation,
          options,
          answer: answer ? { payload: answer.answer_payload, type: answer.answer_type } : null,
          testCases,
          previewMode: true,
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
