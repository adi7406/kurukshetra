import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export const MASTERY_READY_THRESHOLD = 0.60;

export const recommendationsService = {
  /**
   * Compute personalized learning recommendations for an authenticated student.
   * Enforces prerequisite DAG constraints and course enrollments.
   * Ranks activities:
   * Priority 1: Actionable concepts (prerequisites met, mastery < threshold), sorted by lowest mastery first.
   * Priority 2: Blocked concepts (prerequisites not met), identifying the foundational gap.
   * Priority 3: Mastered concepts (mastery >= threshold) for spaced review.
   */
  async getRecommendationsForStudent(studentId) {
    const supabase = getSupabase();

    // 1. Fetch active enrollments for the student
    const { data: enrollments = [] } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const enrolledCourseIds = enrollments.map((e) => e.course_id);

    // 2. Fetch all modules & concepts for enrolled courses
    const { data: allModules = [] } = await supabase.from('modules').select('*');
    const enrolledModules = (allModules || []).filter((m) => enrolledCourseIds.includes(m.course_id));
    const moduleIds = enrolledModules.map((m) => m.id);

    const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
    const enrolledConcepts = (allConcepts || []).filter(
      (c) => moduleIds.includes(c.module_id) || enrolledCourseIds.includes(c.course_id)
    );

    if (enrolledConcepts.length === 0) {
      return [];
    }

    const enrolledConceptIds = enrolledConcepts.map((c) => c.id);

    // 3. Fetch prerequisites
    const { data: allPrereqs = [] } = await supabase.from('concept_prerequisites').select('*');
    const prereqs = (allPrereqs || []).filter((p) => enrolledConceptIds.includes(p.concept_id));

    // 4. Fetch current student mastery
    const { data: allMastery = [] } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId);

    const masteryMap = new Map();
    for (const m of allMastery || []) {
      masteryMap.set(m.concept_id, {
        probability: Number(m.mastery_probability),
        evidenceCount: m.evidence_count || 0,
      });
    }

    // 5. Fetch published learning resources
    const { data: allResources = [] } = await supabase
      .from('learning_resources')
      .select('*');

    const publishedResources = (allResources || []).filter(
      (r) => r.review_status === 'approved' && enrolledConceptIds.includes(r.concept_id)
    );

    // 6. Fetch published assessments
    const { data: allAssessments = [] } = await supabase
      .from('assessments')
      .select('*');

    const publishedAssessments = (allAssessments || []).filter(
      (a) => a.status === 'published' && enrolledCourseIds.includes(a.course_id)
    );

    // 7. Analyze concepts and determine readiness & gaps
    const recommendations = [];

    for (const concept of enrolledConcepts) {
      const currentMastery = masteryMap.get(concept.id) || { probability: 0.10, evidenceCount: 0 };
      const conceptPrereqs = prereqs
        .filter((p) => p.concept_id === concept.id)
        .map((p) => p.prerequisite_concept_id);

      // Check if all prerequisites meet the mastery threshold
      const unsatisfiedPrereqIds = conceptPrereqs.filter((pId) => {
        const pm = masteryMap.get(pId) || { probability: 0.10 };
        return pm.probability < MASTERY_READY_THRESHOLD;
      });

      const isReady = unsatisfiedPrereqIds.length === 0;

      if (isReady) {
        if (currentMastery.probability < MASTERY_READY_THRESHOLD) {
          // Actionable concept: ready to learn or practice
          const conceptResource = publishedResources.find((r) => r.concept_id === concept.id);
          const conceptAssessment = publishedAssessments.find((a) => a.assessment_type === 'practice') || publishedAssessments[0];

          if (conceptResource && currentMastery.evidenceCount === 0) {
            recommendations.push({
              conceptId: concept.id,
              targetConceptName: concept.name,
              targetTitle: conceptResource.title,
              learningResourceId: conceptResource.id,
              assessmentId: null,
              activityType: 'read',
              priority: 1,
              masteryProbability: currentMastery.probability,
              prerequisitesMet: true,
              reason: `Prerequisites met! Study '${conceptResource.title}' to build understanding in '${concept.name}'.`,
            });
          } else if (conceptAssessment) {
            recommendations.push({
              conceptId: concept.id,
              targetConceptName: concept.name,
              targetTitle: conceptAssessment.title,
              learningResourceId: null,
              assessmentId: conceptAssessment.id,
              activityType: 'quiz',
              priority: 1,
              masteryProbability: currentMastery.probability,
              prerequisitesMet: true,
              reason: `Prerequisites met! Practice quiz ready to strengthen mastery in '${concept.name}' (current estimate: ${(currentMastery.probability * 100).toFixed(0)}%).`,
            });
          } else {
            recommendations.push({
              conceptId: concept.id,
              targetConceptName: concept.name,
              targetTitle: `Study: ${concept.name}`,
              learningResourceId: null,
              assessmentId: null,
              activityType: 'read',
              priority: 1,
              masteryProbability: currentMastery.probability,
              prerequisitesMet: true,
              reason: `Prerequisites met! Ready to learn '${concept.name}'.`,
            });
          }
        } else {
          // Mastered concept: spaced review
          recommendations.push({
            conceptId: concept.id,
            targetConceptName: concept.name,
            targetTitle: `Revision: ${concept.name}`,
            learningResourceId: null,
            assessmentId: publishedAssessments[0]?.id || null,
            activityType: 'review',
            priority: 3,
            masteryProbability: currentMastery.probability,
            prerequisitesMet: true,
            reason: `High mastery achieved (${(currentMastery.probability * 100).toFixed(0)}%). Keep skills sharp with periodic revision.`,
          });
        }
      } else {
        // Blocked concept: waiting on prerequisites
        const gapConcept = enrolledConcepts.find((c) => c.id === unsatisfiedPrereqIds[0]);
        const gapMastery = masteryMap.get(unsatisfiedPrereqIds[0])?.probability ?? 0.10;

        recommendations.push({
          conceptId: concept.id,
          targetConceptName: concept.name,
          targetTitle: `Unlock: ${concept.name}`,
          learningResourceId: null,
          assessmentId: null,
          activityType: 'read',
          priority: 2,
          masteryProbability: currentMastery.probability,
          prerequisitesMet: false,
          reason: `Prerequisite '${gapConcept?.name}' has estimated mastery of ${(gapMastery * 100).toFixed(0)}% (threshold: ${MASTERY_READY_THRESHOLD * 100}%). Master '${gapConcept?.name}' first to unlock '${concept.name}'.`,
        });
      }
    }

    // 8. Deduplicate recommendations and sort by priority, then ascending mastery probability
    const uniqueMap = new Map();
    for (const rec of recommendations) {
      const key = `${rec.conceptId}_${rec.activityType}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, rec);
      }
    }

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.masteryProbability - b.masteryProbability;
    });

    // 9. Sync into recommendations table for persistent feedback tracking
    for (const item of sorted) {
      const { data: existing } = await supabase
        .from('recommendations')
        .select('*')
        .eq('student_id', studentId)
        .eq('concept_id', item.conceptId)
        .eq('activity_type', item.activityType)
        .maybeSingle();

      if (existing) {
        item.id = existing.id;
        item.status = existing.status;
      } else {
        const { data: inserted } = await supabase
          .from('recommendations')
          .insert({
            student_id: studentId,
            concept_id: item.conceptId,
            learning_resource_id: item.learningResourceId,
            assessment_id: item.assessmentId,
            activity_type: item.activityType,
            reason: item.reason,
            priority: item.priority,
            status: 'recommended',
            model_version: 'v1',
          })
          .select()
          .single();
        if (inserted) {
          item.id = inserted.id;
          item.status = inserted.status;
        }
      }
    }

    return sorted;
  },

  /**
   * Record student feedback on a recommendation
   */
  async recordRecommendationFeedback(studentId, recommendationId, { status }) {
    const supabase = getSupabase();

    const { data: rec } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .maybeSingle();

    if (!rec) {
      throw new NotFoundError('Recommendation not found.');
    }

    if (rec.student_id !== studentId) {
      throw new ForbiddenError('You can only update feedback on your own recommendations.');
    }

    const { data: updated } = await supabase
      .from('recommendations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single();

    return updated;
  },
};
