import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const assessmentsController = {
  /**
   * List assessments visible to caller.
   * Students see only published assessments in courses they are actively enrolled in.
   * Trainers see draft and published assessments for their courses.
   */
  async listAssessments(req, res, next) {
    try {
      const user = req.user;
      const { courseId } = req.query;
      const supabase = getSupabase();

      const { data: allAssessments = [] } = await supabase.from('assessments').select('*');
      let filtered = allAssessments || [];

      if (courseId) {
        filtered = filtered.filter((a) => a.course_id === courseId);
      }

      if (user.role === 'student') {
        // Fetch student active enrollments
        const { data: enrollments = [] } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'active');
        const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

        filtered = filtered.filter((a) => a.status === 'published' && enrolledCourseIds.includes(a.course_id));
      } else if (user.role === 'trainer') {
        filtered = filtered.filter((a) => a.created_by === user.id || a.status === 'published');
      }

      res.status(200).json({
        data: filtered,
        meta: {
          requestId: req.requestId,
          count: filtered.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create assessment draft (Trainer/Admin)
   */
  async createAssessment(req, res, next) {
    try {
      const { courseId } = req.params;
      const {
        title,
        description = null,
        assessmentType = 'practice',
        durationMinutes = null,
        maxAttempts = 1,
        passingPercentage = 60.0,
        settings = {},
        questions = [],
      } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to create assessments for this course.');
      }

      // Create assessment
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert({
          course_id: courseId,
          title,
          description,
          assessment_type: assessmentType,
          status: 'draft',
          duration_minutes: durationMinutes,
          max_attempts: maxAttempts,
          passing_percentage: passingPercentage,
          settings,
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !assessment) {
        throw new Error('Failed to create assessment.');
      }

      // Map questions if provided
      if (Array.isArray(questions) && questions.length > 0) {
        const questionRows = questions.map((q, idx) => ({
          assessment_id: assessment.id,
          question_version_id: q.questionVersionId || q.id,
          position: q.position !== undefined ? q.position : idx,
          marks_override: q.marksOverride || null,
        }));
        await supabase.from('assessment_questions').insert(questionRows);
      }

      res.status(201).json({
        data: assessment,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get assessment by ID.
   * If student:
   * - Must be enrolled and assessment must be published.
   * - STRICT: Redact answer keys and hidden test cases from questions.
   */
  async getAssessmentById(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: assessment } = await supabase.from('assessments').select('*').eq('id', assessmentId).maybeSingle();
      if (!assessment) {
        throw new NotFoundError('Assessment not found.');
      }

      const isPrivileged = user.role === 'trainer' || user.role === 'admin';

      if (!isPrivileged) {
        if (assessment.status !== 'published') {
          throw new NotFoundError('Assessment not found or not published.');
        }

        // Verify active student enrollment
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', assessment.course_id)
          .eq('student_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!enrollment) {
          throw new ForbiddenError('You are not actively enrolled in the course for this assessment.');
        }
      }

      // Fetch assessment questions mapping
      const { data: mapping = [] } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId);

      const sortedMapping = [...(mapping || [])].sort((a, b) => a.position - b.position);
      const questionVersionIds = sortedMapping.map((m) => m.question_version_id);

      // Fetch snapshot question versions
      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const attachedVersions = (allVersions || []).filter((v) => questionVersionIds.includes(v.id));

      // Fetch options
      const { data: allOptions = [] } = await supabase.from('question_options').select('*');

      // Fetch test cases
      const { data: allTestCases = [] } = await supabase.from('coding_test_cases').select('*');

      const questions = sortedMapping.map((mapItem) => {
        const v = attachedVersions.find((ver) => ver.id === mapItem.question_version_id);
        if (!v) return null;

        const opts = (allOptions || []).filter((o) => o.question_version_id === v.id);
        const tcs = (allTestCases || []).filter((tc) => tc.question_version_id === v.id);

        const safeOptions = opts.map((o) => {
          if (!isPrivileged) {
            const { is_correct: _removed, ...safe } = o;
            return safe;
          }
          return o;
        });

        const safeTestCases = tcs
          .filter((tc) => isPrivileged || !tc.is_hidden)
          .map((tc) => {
            if (!isPrivileged) {
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

        return {
          questionVersionId: v.id,
          position: mapItem.position,
          marks: mapItem.marks_override !== null ? mapItem.marks_override : v.marks,
          negativeMarks: v.negative_marks,
          questionType: v.question_type,
          prompt: v.prompt,
          difficulty: v.difficulty,
          options: safeOptions,
          sampleTestCases: safeTestCases,
        };
      }).filter(Boolean);

      res.status(200).json({
        data: {
          ...assessment,
          questions,
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
   * Update draft assessment (Trainer/Admin)
   */
  async updateAssessment(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const { title, description, durationMinutes, maxAttempts, passingPercentage, settings, questions } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: assessment } = await supabase.from('assessments').select('*').eq('id', assessmentId).maybeSingle();
      if (!assessment) {
        throw new NotFoundError('Assessment not found.');
      }

      if (assessment.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to update this assessment.');
      }

      if (assessment.status === 'published') {
        throw new ValidationError('Published assessments cannot be edited directly; create a new version.');
      }

      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
      if (maxAttempts !== undefined) updates.max_attempts = maxAttempts;
      if (passingPercentage !== undefined) updates.passing_percentage = passingPercentage;
      if (settings !== undefined) updates.settings = settings;

      const { data: updated } = await supabase
        .from('assessments')
        .update(updates)
        .eq('id', assessmentId)
        .select()
        .single();

      // If new question mapping provided, replace mappings
      if (Array.isArray(questions)) {
        await supabase.from('assessment_questions').delete().eq('assessment_id', assessmentId);
        const questionRows = questions.map((q, idx) => ({
          assessment_id: assessmentId,
          question_version_id: q.questionVersionId || q.id,
          position: q.position !== undefined ? q.position : idx,
          marks_override: q.marksOverride || null,
        }));
        if (questionRows.length > 0) {
          await supabase.from('assessment_questions').insert(questionRows);
        }
      }

      res.status(200).json({
        data: updated,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Publish assessment (Trainer/Admin)
   */
  async publishAssessment(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: assessment } = await supabase.from('assessments').select('*').eq('id', assessmentId).maybeSingle();
      if (!assessment) {
        throw new NotFoundError('Assessment not found.');
      }

      if (assessment.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to publish this assessment.');
      }

      // Verify assessment has questions assigned
      const { data: questions = [] } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId);

      if (!questions || questions.length === 0) {
        throw new ValidationError('Cannot publish an assessment with zero questions.');
      }

      const { data: published } = await supabase
        .from('assessments')
        .update({ status: 'published' })
        .eq('id', assessmentId)
        .select()
        .single();

      res.status(200).json({
        data: published,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create test series (Trainer/Admin)
   */
  async createTestSeries(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, description = null, assessmentIds = [] } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      const { data: series, error } = await supabase
        .from('test_series')
        .insert({
          course_id: courseId,
          title,
          description,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !series) {
        throw new Error('Failed to create test series.');
      }

      if (Array.isArray(assessmentIds) && assessmentIds.length > 0) {
        const itemRows = assessmentIds.map((aId, idx) => ({
          test_series_id: series.id,
          assessment_id: aId,
          position: idx,
        }));
        await supabase.from('test_series_items').insert(itemRows);
      }

      res.status(201).json({
        data: series,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Publish test series (Trainer/Admin)
   */
  async publishTestSeries(req, res, next) {
    try {
      const { testSeriesId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: series } = await supabase.from('test_series').select('*').eq('id', testSeriesId).maybeSingle();
      if (!series) {
        throw new NotFoundError('Test series not found.');
      }

      if (series.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to publish this test series.');
      }

      const { data: published } = await supabase
        .from('test_series')
        .update({ status: 'published' })
        .eq('id', testSeriesId)
        .select()
        .single();

      res.status(200).json({
        data: published,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List test series visible to caller
   */
  async listTestSeries(req, res, next) {
    try {
      const user = req.user;
      const supabase = getSupabase();

      const { data: allSeries = [] } = await supabase.from('test_series').select('*');
      let visible = allSeries || [];

      if (user.role === 'student') {
        const { data: enrollments = [] } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'active');
        const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

        visible = visible.filter((s) => s.status === 'published' && enrolledCourseIds.includes(s.course_id));
      }

      res.status(200).json({
        data: visible,
        meta: {
          requestId: req.requestId,
          count: visible.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get test series by ID
   */
  async getTestSeriesById(req, res, next) {
    try {
      const { testSeriesId } = req.params;
      const supabase = getSupabase();

      const { data: series } = await supabase.from('test_series').select('*').eq('id', testSeriesId).maybeSingle();
      if (!series) {
        throw new NotFoundError('Test series not found.');
      }

      // Fetch items
      const { data: allItems = [] } = await supabase
        .from('test_series_items')
        .select('*')
        .eq('test_series_id', testSeriesId);

      const sortedItems = [...(allItems || [])].sort((a, b) => a.position - b.position);
      const assessmentIds = sortedItems.map((i) => i.assessment_id);

      const { data: allAssessments = [] } = await supabase.from('assessments').select('*');
      const assessments = (allAssessments || []).filter((a) => assessmentIds.includes(a.id));

      res.status(200).json({
        data: {
          ...series,
          assessments,
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
