import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { masteryService } from './mastery.service.js';
import { recommendationsService } from './recommendations.service.js';

export const dashboardService = {
  /**
   * Aggregate comprehensive dashboard data for an authenticated learner
   * Conforms to PRD FR-16 and TASK-033:
   * - Enrolled courses and progress
   * - Assessment history
   * - Concept mastery estimates and categorization (strong, developing, weak, insufficient_evidence)
   * - Recommended next learning activities
   * - Coding submissions and viva results
   * - State metadata (isEmpty, isStale, lastActivityAt)
   * - Strict non-fabrication guarantee
   */
  async getLearnerDashboard(studentId, requestingUser = null) {
    if (requestingUser) {
      const isSelf = requestingUser.id === studentId;
      const isPrivileged = requestingUser.role === 'trainer' || requestingUser.role === 'admin';
      if (!isSelf && !isPrivileged) {
        throw new ForbiddenError('You do not have permission to view this student dashboard.');
      }
    }

    const supabase = getSupabase();

    // 1. Fetch student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, email, role, created_at')
      .eq('id', studentId)
      .maybeSingle();

    if (!profile) {
      throw new NotFoundError('Student profile not found.');
    }

    // 2. Fetch active enrollments
    const { data: enrollments = [] } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active');

    const enrolledCourseIds = (enrollments || []).map((e) => e.course_id);

    // 3. Fetch course details and assessment progress
    const { data: allCourses = [] } = await supabase.from('courses').select('*');
    const { data: allAssessments = [] } = await supabase.from('assessments').select('*');
    const { data: allAttempts = [] } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('student_id', studentId);

    const coursesData = (enrollments || []).map((enrollment) => {
      const course = (allCourses || []).find((c) => c.id === enrollment.course_id);
      const courseAssessments = (allAssessments || []).filter(
        (a) => a.course_id === enrollment.course_id && a.status === 'published'
      );
      const courseAssessmentIds = courseAssessments.map((a) => a.id);

      const attemptsInCourse = (allAttempts || []).filter((att) =>
        courseAssessmentIds.includes(att.assessment_id)
      );

      const completedAttempts = attemptsInCourse.filter((att) => att.status === 'completed');
      const uniqueCompletedAssessments = new Set(completedAttempts.map((att) => att.assessment_id));

      const totalAssessmentsCount = courseAssessments.length;
      const completedAssessmentsCount = uniqueCompletedAssessments.size;
      const progressPercentage =
        totalAssessmentsCount > 0
          ? Math.round((completedAssessmentsCount / totalAssessmentsCount) * 100)
          : 0;

      return {
        courseId: enrollment.course_id,
        title: course?.title || 'Course',
        description: course?.description || '',
        enrolledAt: enrollment.created_at,
        status: enrollment.status,
        assessmentsTotal: totalAssessmentsCount,
        assessmentsCompleted: completedAssessmentsCount,
        progressPercentage,
      };
    });

    // 4. Assessment history
    const assessmentHistory = (allAttempts || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((att) => {
        const assessment = (allAssessments || []).find((a) => a.id === att.assessment_id);
        const isCompleted = att.status === 'completed';
        return {
          attemptId: att.id,
          assessmentId: att.assessment_id,
          assessmentTitle: assessment?.title || 'Assessment',
          assessmentType: assessment?.assessment_type || 'practice',
          status: att.status,
          score: isCompleted ? Number(att.score) : null,
          maxScore: isCompleted ? Number(att.max_score) : null,
          isPassing: isCompleted ? att.is_passing : null,
          startedAt: att.started_at,
          submittedAt: att.submitted_at || null,
          completedAt: att.completed_at || null,
        };
      });

    // 5. Concept Mastery Estimates & Categorization
    const masterySummaries = await masteryService.getStudentMasterySummary(studentId);

    // Fetch all concepts in enrolled courses to check for insufficiently evidenced concepts
    const { data: allModules = [] } = await supabase.from('modules').select('*');
    const enrolledModules = (allModules || []).filter((m) => enrolledCourseIds.includes(m.course_id));
    const moduleIds = enrolledModules.map((m) => m.id);

    const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
    const enrolledConcepts = (allConcepts || []).filter(
      (c) => moduleIds.includes(c.module_id) || enrolledCourseIds.includes(c.course_id)
    );

    const masteryByConceptId = new Map(masterySummaries.map((m) => [m.conceptId, m]));

    const fullConceptMastery = enrolledConcepts.map((concept) => {
      const parentCourseId =
        concept.course_id || enrolledModules.find((m) => m.id === concept.module_id)?.course_id || null;
      const record = masteryByConceptId.get(concept.id);
      if (record && record.evidenceCount > 0) {
        let category = 'developing';
        if (record.masteryProbability >= 0.8) {
          category = 'strong';
        } else if (record.masteryProbability < 0.5) {
          category = 'weak';
        }

        return {
          conceptId: concept.id,
          conceptName: concept.name,
          courseId: parentCourseId,
          masteryProbability: record.masteryProbability,
          category,
          evidenceCount: record.evidenceCount,
          lastEvidenceAt: record.lastEvidenceAt,
          isEstimated: true,
        };
      }

      // No evidence recorded yet: strictly labeled insufficient_evidence (no fabricated score)
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        courseId: parentCourseId,
        masteryProbability: null,
        category: 'insufficient_evidence',
        evidenceCount: 0,
        lastEvidenceAt: null,
        isEstimated: false,
      };
    });

    const strongCount = fullConceptMastery.filter((c) => c.category === 'strong').length;
    const developingCount = fullConceptMastery.filter((c) => c.category === 'developing').length;
    const weakCount = fullConceptMastery.filter((c) => c.category === 'weak').length;
    const insufficientCount = fullConceptMastery.filter(
      (c) => c.category === 'insufficient_evidence'
    ).length;

    // 6. Adaptive Recommendations
    const recommendations = await recommendationsService.getRecommendationsForStudent(studentId);

    // 7. Coding Submissions
    const { data: submissions = [] } = await supabase
      .from('submissions')
      .select('id, language, status, score, max_score, created_at, completed_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // 8. Viva Sessions
    const { data: vivaSessions = [] } = await supabase
      .from('viva_sessions')
      .select('id, attempt_id, status, total_questions, duration_seconds, started_at, completed_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // 9. State metadata & Activity Tracking
    const activityTimestamps = [
      ...enrollments.map((e) => new Date(e.created_at).getTime()),
      ...allAttempts.map((a) => new Date(a.created_at).getTime()),
      ...submissions.map((s) => new Date(s.created_at).getTime()),
      ...vivaSessions.map((v) => new Date(v.started_at).getTime()),
    ].filter((t) => !isNaN(t));

    const latestActivityMs = activityTimestamps.length > 0 ? Math.max(...activityTimestamps) : null;
    const lastActivityAt = latestActivityMs ? new Date(latestActivityMs).toISOString() : null;

    const isEmpty = enrollments.length === 0 && allAttempts.length === 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const isStale = latestActivityMs ? latestActivityMs < thirtyDaysAgo : false;

    let displayState = 'active';
    if (isEmpty) {
      displayState = 'empty';
    } else if (isStale) {
      displayState = 'stale';
    }

    return {
      learner: {
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        role: profile.role,
      },
      enrolledCourses: coursesData,
      assessmentHistory,
      mastery: {
        concepts: fullConceptMastery,
        summary: {
          totalConcepts: fullConceptMastery.length,
          strongCount,
          developingCount,
          weakCount,
          insufficientEvidenceCount: insufficientCount,
        },
        disclaimer:
          'Mastery scores are model-derived probabilistic estimates, not absolute statements of ability.',
      },
      recommendations,
      recentSubmissions: (submissions || []).slice(0, 10),
      vivaSessions: (vivaSessions || []).slice(0, 5),
      state: {
        status: displayState,
        isEmpty,
        isStale,
        lastActivityAt,
        generatedAt: new Date().toISOString(),
      },
    };
  },

  /**
   * Trainer course-level dashboard aggregate
   * Conforms to API_SPEC Section 5.12, PRD FR-17, and TASK-034
   */
  async getTrainerCourseDashboard(courseId, trainerUser) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may access the trainer dashboard.');
    }

    const supabase = getSupabase();

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    if (trainerUser.role !== 'admin' && course.created_by !== trainerUser.id) {
      throw new ForbiddenError('You are not authorized to view the dashboard for this course.');
    }

    // 1. Fetch enrollments
    const { data: enrollments = [] } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId);

    const activeEnrollments = (enrollments || []).filter((e) => e.status === 'active');
    const enrolledStudentIds = (enrollments || []).map((e) => e.student_id);

    // 2. Fetch assessments in course
    const { data: allAssessments = [] } = await supabase
      .from('assessments')
      .select('*')
      .eq('course_id', courseId);

    const assessmentIds = (allAssessments || []).map((a) => a.id);

    // 3. Fetch attempts for assessments in this course
    const { data: allAttempts = [] } = await supabase.from('assessment_attempts').select('*');
    const courseAttempts = (allAttempts || []).filter((att) =>
      assessmentIds.includes(att.assessment_id)
    );

    const assessmentSummaries = (allAssessments || []).map((assess) => {
      const attempts = courseAttempts.filter((att) => att.assessment_id === assess.id);
      const completed = attempts.filter((att) => att.status === 'completed');
      const passed = completed.filter((att) => att.passed === true || att.is_passing === true);

      const totalScore = completed.reduce((sum, att) => sum + Number(att.score || 0), 0);
      const averageScore =
        completed.length > 0 ? parseFloat((totalScore / completed.length).toFixed(2)) : 0;
      const passRate =
        completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0;

      return {
        id: assess.id,
        title: assess.title,
        assessmentType: assess.assessment_type,
        status: assess.status,
        durationMinutes: assess.duration_minutes,
        totalAttempts: attempts.length,
        completedAttempts: completed.length,
        averageScore,
        passRate,
      };
    });

    // 4. Class-level concept mastery & commonly misunderstood concepts
    const { data: allModules = [] } = await supabase.from('modules').select('*');
    const courseModules = (allModules || []).filter((m) => m.course_id === courseId);
    const moduleIds = courseModules.map((m) => m.id);

    const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
    const courseConcepts = (allConcepts || []).filter(
      (c) => moduleIds.includes(c.module_id) || c.course_id === courseId
    );

    const { data: allMastery = [] } = await supabase.from('student_mastery').select('*');

    const conceptAverages = courseConcepts.map((concept) => {
      const records = (allMastery || []).filter(
        (m) => m.concept_id === concept.id && enrolledStudentIds.includes(m.student_id)
      );

      const totalProb = records.reduce((sum, r) => sum + Number(r.mastery_probability || 0), 0);
      const averageMastery =
        records.length > 0 ? parseFloat((totalProb / records.length).toFixed(2)) : null;

      return {
        conceptId: concept.id,
        conceptName: concept.name,
        evaluatedStudentsCount: records.length,
        averageMastery,
      };
    });

    // Commonly misunderstood concepts: average mastery < 0.60
    const commonlyMisunderstood = conceptAverages
      .filter((c) => c.averageMastery !== null && c.averageMastery < 0.6)
      .sort((a, b) => a.averageMastery - b.averageMastery);

    // 5. Pending reviews count
    const attemptIdsInCourse = courseAttempts.map((a) => a.id);

    const { data: allVivaAnswers = [] } = await supabase.from('viva_answers').select('*');
    const pendingVivaReviews = (allVivaAnswers || []).filter(
      (va) => va.review_status === 'needs_review'
    ).length;

    const { data: allIntegrityReviews = [] } = await supabase.from('integrity_reviews').select('*');
    const pendingIntegrityReviews = (allIntegrityReviews || []).filter(
      (ir) =>
        attemptIdsInCourse.includes(ir.attempt_id) &&
        (ir.status === 'pending' || ir.status === 'in_review')
    ).length;

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        status: course.status,
        createdAt: course.created_at,
      },
      enrollmentStats: {
        totalEnrolled: enrollments.length,
        activeEnrolled: activeEnrollments.length,
      },
      assessmentSummaries,
      classConceptMastery: {
        concepts: conceptAverages,
        commonlyMisunderstoodConcepts: commonlyMisunderstood,
      },
      pendingReviews: {
        vivaAnswersCount: pendingVivaReviews,
        integrityReviewsCount: pendingIntegrityReviews,
        total: pendingVivaReviews + pendingIntegrityReviews,
      },
    };
  },

  /**
   * Trainer student roster with privacy minimization
   */
  async getTrainerCourseStudents(courseId, trainerUser) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may access student progress.');
    }

    const supabase = getSupabase();

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    if (trainerUser.role !== 'admin' && course.created_by !== trainerUser.id) {
      throw new ForbiddenError('You are not authorized to view students for this course.');
    }

    const { data: enrollments = [] } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId);

    const { data: profiles = [] } = await supabase.from('profiles').select('*');
    const { data: assessments = [] } = await supabase
      .from('assessments')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published');
    const courseAssessmentIds = assessments.map((a) => a.id);

    const { data: allAttempts = [] } = await supabase.from('assessment_attempts').select('*');

    const students = (enrollments || []).map((enrollment) => {
      const studentProfile = profiles.find((p) => p.id === enrollment.student_id);

      const attempts = (allAttempts || []).filter(
        (att) =>
          att.student_id === enrollment.student_id &&
          courseAssessmentIds.includes(att.assessment_id) &&
          att.status === 'completed'
      );

      const uniquePassedAssessments = new Set(
        attempts
          .filter((att) => att.passed === true || att.is_passing === true)
          .map((att) => att.assessment_id)
      );

      const progressPercentage =
        courseAssessmentIds.length > 0
          ? Math.round((uniquePassedAssessments.size / courseAssessmentIds.length) * 100)
          : 0;

      const totalScore = attempts.reduce((sum, a) => sum + Number(a.score || 0), 0);
      const avgScore =
        attempts.length > 0 ? parseFloat((totalScore / attempts.length).toFixed(2)) : 0;

      // Privacy minimization: only return necessary educational progress data
      return {
        studentId: enrollment.student_id,
        displayName: studentProfile?.display_name || 'Student',
        enrolledAt: enrollment.created_at,
        status: enrollment.status,
        assessmentsCompletedCount: attempts.length,
        progressPercentage,
        averageScore: avgScore,
      };
    });

    return {
      courseId,
      totalStudents: students.length,
      students,
    };
  },

  /**
   * Trainer assessment performance analytics
   */
  async getTrainerAssessmentAnalytics(courseId, assessmentId, trainerUser) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may access assessment analytics.');
    }

    const supabase = getSupabase();

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    if (trainerUser.role !== 'admin' && course.created_by !== trainerUser.id) {
      throw new ForbiddenError('You are not authorized to view analytics for this course.');
    }

    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!assessment) {
      throw new NotFoundError('Assessment not found in this course.');
    }

    const { data: allAttempts = [] } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('assessment_id', assessmentId);

    const completed = (allAttempts || []).filter((a) => a.status === 'completed');
    const passed = completed.filter((a) => a.passed === true || a.is_passing === true);
    const failed = completed.filter((a) => !passed.includes(a));

    // Score distribution buckets
    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    let totalScore = 0;
    for (const att of completed) {
      const score = Number(att.score || 0);
      const maxScore = Number(att.max_score || 100);
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      totalScore += score;

      if (pct <= 20) distribution['0-20']++;
      else if (pct <= 40) distribution['21-40']++;
      else if (pct <= 60) distribution['41-60']++;
      else if (pct <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    }

    const averageScore =
      completed.length > 0 ? parseFloat((totalScore / completed.length).toFixed(2)) : 0;
    const passRate =
      completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0;

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        assessmentType: assessment.assessment_type,
        passingPercentage: assessment.passing_percentage,
      },
      stats: {
        totalAttempts: allAttempts.length,
        completedAttempts: completed.length,
        passedCount: passed.length,
        failedCount: failed.length,
        averageScore,
        passRate,
        scoreDistribution: distribution,
      },
    };
  },

  /**
   * Drafts awaiting review or publication owned by the trainer
   */
  async getTrainerDrafts(trainerUser) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may access drafts.');
    }

    const supabase = getSupabase();

    // Draft questions from question_versions
    const { data: allQuestions = [] } = await supabase.from('questions').select('*');
    const myQuestions = (allQuestions || []).filter(
      (q) => trainerUser.role === 'admin' || q.created_by === trainerUser.id
    );
    const myQuestionIds = myQuestions.map((q) => q.id);

    const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
    const draftVersions = (allVersions || []).filter(
      (v) => myQuestionIds.includes(v.question_id) && v.review_status !== 'approved'
    );

    const draftQuestions = draftVersions.map((v) => {
      const parentQ = myQuestions.find((q) => q.id === v.question_id);
      return {
        id: parentQ?.id || v.question_id,
        versionId: v.id,
        courseId: parentQ?.course_id || null,
        prompt: v.prompt,
        type: v.question_type,
        reviewStatus: v.review_status,
        createdAt: v.created_at,
      };
    });

    // Draft assessments
    const { data: allAssessments = [] } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'draft');

    const { data: allCourses = [] } = await supabase.from('courses').select('*');
    const myCourseIds = (allCourses || [])
      .filter((c) => trainerUser.role === 'admin' || c.created_by === trainerUser.id)
      .map((c) => c.id);

    const draftAssessments = (allAssessments || []).filter((a) => myCourseIds.includes(a.course_id));

    return {
      draftQuestions,
      draftAssessments: draftAssessments.map((a) => ({
        id: a.id,
        courseId: a.course_id,
        title: a.title,
        assessmentType: a.assessment_type,
        createdAt: a.created_at,
      })),
      totalDrafts: draftQuestions.length + draftAssessments.length,
    };
  },
};

