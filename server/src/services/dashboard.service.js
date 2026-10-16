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
};
