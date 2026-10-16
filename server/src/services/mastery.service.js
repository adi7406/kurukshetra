import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const MASTERY_MODELS = {
  BASELINE: 'rule_based_baseline',
  BKT: 'bkt',
};

export const MODEL_VERSIONS = {
  [MASTERY_MODELS.BASELINE]: 'v1',
  [MASTERY_MODELS.BKT]: 'bkt-v1',
};

export const DEFAULT_BKT_PARAMS = {
  pL0: 0.10, // initial knowledge probability
  pT: 0.15,  // transition / learning probability
  pG: 0.20,  // guess probability (e.g. 4-option MCQ)
  pS: 0.10,  // slip probability
};

export const masteryService = {
  /**
   * Calculate updated mastery probability using the baseline model:
   * new_mastery = old_mastery + alpha * (observed_result - old_mastery)
   * where observed_result = isCorrect ? 1.0 : 0.0
   * alpha defaults to 0.20 (learning rate)
   */
  calculateNewMastery({ oldMastery = 0.1, isCorrect = false, alpha = 0.2 }) {
    const observedResult = isCorrect ? 1.0 : 0.0;
    const current = Math.max(0, Math.min(1, Number(oldMastery)));
    const updated = current + alpha * (observedResult - current);
    return Number(Math.max(0, Math.min(1, updated)).toFixed(5));
  },

  /**
   * Bayesian Knowledge Tracing (BKT) probability update:
   * 1. Posterior knowledge given observation:
   *    If correct: P(L_{t-1} | obs=1) = (P(L)*(1-S)) / (P(L)*(1-S) + (1-P(L))*G)
   *    If wrong:   P(L_{t-1} | obs=0) = (P(L)*S) / (P(L)*S + (1-P(L))*(1-G))
   * 2. Knowledge acquisition / transition:
   *    P(L_t) = P(L_{t-1} | obs) + (1 - P(L_{t-1} | obs)) * T
   */
  calculateBktMastery({
    priorL = DEFAULT_BKT_PARAMS.pL0,
    isCorrect = false,
    params = {},
  }) {
    const pL0 = params.pL0 ?? DEFAULT_BKT_PARAMS.pL0;
    const pT = params.pT ?? DEFAULT_BKT_PARAMS.pT;
    const pG = params.pG ?? DEFAULT_BKT_PARAMS.pG;
    const pS = params.pS ?? DEFAULT_BKT_PARAMS.pS;

    const currentL = Math.max(0.0001, Math.min(0.9999, Number(priorL ?? pL0)));

    let pLGivenObs;
    if (isCorrect) {
      const num = currentL * (1 - pS);
      const denom = num + (1 - currentL) * pG;
      pLGivenObs = denom > 0 ? num / denom : currentL;
    } else {
      const num = currentL * pS;
      const denom = num + (1 - currentL) * (1 - pG);
      pLGivenObs = denom > 0 ? num / denom : currentL;
    }

    const nextL = pLGivenObs + (1 - pLGivenObs) * pT;
    return Number(Math.max(0, Math.min(1, nextL)).toFixed(5));
  },

  /**
   * Calculate estimate based on specified model and parameters.
   */
  calculateEstimate({
    modelName = MASTERY_MODELS.BASELINE,
    oldMastery = 0.10,
    isCorrect = false,
    modelParams = {},
  }) {
    if (modelName === MASTERY_MODELS.BKT) {
      return this.calculateBktMastery({
        priorL: oldMastery,
        isCorrect,
        params: modelParams,
      });
    }
    return this.calculateNewMastery({
      oldMastery,
      isCorrect,
      alpha: modelParams.alpha || 0.20,
    });
  },

  /**
   * Process all evaluated answers from a completed/submitted attempt into normalized learning evidence.
   * Maps question versions to concepts via question_concepts.
   * Ensures idempotent processing so reprocessing never duplicates evidence or inflates mastery.
   * Updates student_mastery and appends to mastery_history.
   */
  async processAttemptEvidence(attemptId, options = {}) {
    const supabase = getSupabase();
    const modelName = options.modelName || MASTERY_MODELS.BASELINE;
    const modelVersion = MODEL_VERSIONS[modelName] || 'v1';

    // 1. Fetch attempt
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Attempt not found for mastery evidence ingestion.');
    }

    if (attempt.status !== 'submitted' && attempt.status !== 'completed') {
      throw new ValidationError('Only submitted or completed attempts can produce mastery evidence.');
    }

    // 2. Fetch all evaluated answers for this attempt
    const { data: studentAnswers = [] } = await supabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const evaluatedAnswers = (studentAnswers || []).filter(
      (a) => a.evaluation_status === 'evaluated'
    );

    if (evaluatedAnswers.length === 0) {
      return {
        attemptId,
        processedEvidenceCount: 0,
        newEvidenceRecorded: 0,
        conceptsUpdated: 0,
      };
    }

    // 3. Fetch question_concepts mappings and question versions
    const questionVersionIds = evaluatedAnswers.map((a) => a.question_version_id);
    const { data: allQuestionConcepts = [] } = await supabase
      .from('question_concepts')
      .select('*');

    const mappedConcepts = (allQuestionConcepts || []).filter((qc) =>
      questionVersionIds.includes(qc.question_version_id)
    );

    const { data: allQuestionVersions = [] } = await supabase
      .from('question_versions')
      .select('*');

    // 4. Ingest evidence idempotently
    let newEvidenceRecorded = 0;
    const conceptsTouched = new Set();

    for (const answer of evaluatedAnswers) {
      const qVersion = (allQuestionVersions || []).find((v) => v.id === answer.question_version_id);
      let targetConceptIds = mappedConcepts
        .filter((qc) => qc.question_version_id === answer.question_version_id)
        .map((qc) => qc.concept_id);

      // Fallback: if no question_concepts mapping, check if question or version directly has concept_id
      if (targetConceptIds.length === 0 && qVersion?.concept_id) {
        targetConceptIds = [qVersion.concept_id];
      }

      for (const conceptId of targetConceptIds) {
        // Idempotency check: has this (student_answer_id, concept_id) already been recorded?
        const { data: existingEvidence } = await supabase
          .from('learning_attempts')
          .select('*')
          .eq('student_answer_id', answer.id)
          .eq('concept_id', conceptId)
          .maybeSingle();

        if (existingEvidence) {
          // Already recorded, skip to prevent double counting
          continue;
        }

        const isCorrect = Boolean(answer.is_correct);
        const score = Number(answer.score || 0);
        const maxScore = Number(answer.max_score || 0);

        // Insert new learning_attempt record
        const { data: insertedEvidence } = await supabase
          .from('learning_attempts')
          .insert({
            student_id: attempt.student_id,
            concept_id: conceptId,
            question_version_id: answer.question_version_id,
            student_answer_id: answer.id,
            attempt_id: attempt.id,
            is_correct: isCorrect,
            score,
            max_score: maxScore,
            difficulty: qVersion?.difficulty || 'medium',
            hints_used: 0,
            attempt_count: attempt.attempt_number || 1,
            evidence_type: 'assessment_answer',
            occurred_at: answer.evaluated_at || new Date().toISOString(),
            metadata: {
              assessmentId: attempt.assessment_id,
              questionType: qVersion?.question_type,
            },
          })
          .select()
          .single();

        newEvidenceRecorded += 1;
        conceptsTouched.add(conceptId);

        // Update student mastery and append to mastery_history
        await this.updateConceptMastery({
          studentId: attempt.student_id,
          conceptId,
          isCorrect,
          score,
          maxScore,
          modelName,
          modelVersion,
          modelParams: options.modelParams || {},
          evidenceSourceId: insertedEvidence?.id,
          evidenceSourceType: 'learning_attempt',
        });
      }
    }

    return {
      attemptId,
      processedEvidenceCount: evaluatedAnswers.length,
      newEvidenceRecorded,
      conceptsUpdated: conceptsTouched.size,
    };
  },

  /**
   * Updates student mastery for a single concept and appends an entry to mastery_history.
   */
  async updateConceptMastery({
    studentId,
    conceptId,
    isCorrect,
    score = 0,
    maxScore = 0,
    modelName = MASTERY_MODELS.BASELINE,
    modelVersion = MODEL_VERSIONS[MASTERY_MODELS.BASELINE],
    modelParams = {},
    evidenceSourceId = null,
    evidenceSourceType = 'learning_attempt',
  }) {
    const supabase = getSupabase();

    // 1. Fetch current mastery record
    const { data: currentMastery } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    const oldProbability = currentMastery
      ? Number(currentMastery.mastery_probability)
      : 0.10000;
    const oldEvidenceCount = currentMastery
      ? Number(currentMastery.evidence_count || 0)
      : 0;

    const newProbability = this.calculateEstimate({
      modelName,
      oldMastery: oldProbability,
      isCorrect,
      modelParams,
    });

    const now = new Date().toISOString();

    // 2. Append to mastery_history (strictly append-only)
    await supabase.from('mastery_history').insert({
      student_id: studentId,
      concept_id: conceptId,
      previous_probability: oldProbability,
      new_probability: newProbability,
      evidence_source_type: evidenceSourceType,
      evidence_source_id: evidenceSourceId,
      model_name: modelName,
      model_version: modelVersion,
      reason: {
        isCorrect,
        score,
        maxScore,
        params: modelParams,
      },
      created_at: now,
    });

    // 3. Upsert student_mastery
    if (currentMastery) {
      await supabase
        .from('student_mastery')
        .update({
          mastery_probability: newProbability,
          evidence_count: oldEvidenceCount + 1,
          model_name: modelName,
          model_version: modelVersion,
          last_evidence_at: now,
          updated_at: now,
        })
        .eq('id', currentMastery.id);
    } else {
      await supabase.from('student_mastery').insert({
        student_id: studentId,
        concept_id: conceptId,
        mastery_probability: newProbability,
        evidence_count: 1,
        model_name: modelName,
        model_version: modelVersion,
        last_evidence_at: now,
        updated_at: now,
      });
    }

    return {
      studentId,
      conceptId,
      previousProbability: oldProbability,
      newProbability,
      evidenceCount: oldEvidenceCount + 1,
      modelName,
      modelVersion,
    };
  },

  /**
   * Get student's mastery summary across all concepts
   */
  async getStudentMasterySummary(studentId) {
    const supabase = getSupabase();
    const { data: records = [] } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId);

    const { data: allConcepts = [] } = await supabase
      .from('concepts')
      .select('*');

    return (records || []).map((r) => {
      const concept = (allConcepts || []).find((c) => c.id === r.concept_id);
      return {
        conceptId: r.concept_id,
        conceptName: concept?.name || 'Concept',
        description: concept?.description || null,
        courseId: concept?.course_id || null,
        masteryProbability: Number(r.mastery_probability),
        evidenceCount: r.evidence_count,
        modelName: r.model_name,
        modelVersion: r.model_version,
        lastEvidenceAt: r.last_evidence_at,
        updatedAt: r.updated_at,
        disclaimer: 'Mastery estimates are mathematical approximations based on learning evidence, not a guarantee of ability.',
      };
    });
  },

  /**
   * Get mastery details and history trail for a single concept
   */
  async getConceptMasteryDetails(studentId, conceptId) {
    const supabase = getSupabase();

    const { data: concept } = await supabase
      .from('concepts')
      .select('*')
      .eq('id', conceptId)
      .maybeSingle();

    if (!concept) {
      throw new NotFoundError('Concept not found.');
    }

    const { data: currentMastery } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    const { data: history = [] } = await supabase
      .from('mastery_history')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .order('created_at', { ascending: false });

    return {
      conceptId: concept.id,
      conceptName: concept.name,
      description: concept.description,
      courseId: concept.course_id,
      masteryProbability: currentMastery ? Number(currentMastery.mastery_probability) : 0.10000,
      evidenceCount: currentMastery ? currentMastery.evidence_count : 0,
      modelName: currentMastery?.model_name || MASTERY_MODELS.BASELINE,
      modelVersion: currentMastery?.model_version || 'v1',
      lastEvidenceAt: currentMastery?.last_evidence_at || null,
      updatedAt: currentMastery?.updated_at || null,
      history: history || [],
      disclaimer: 'Mastery estimates are mathematical approximations based on learning evidence, not a guarantee of ability.',
    };
  },

  /**
   * Get learner mastery breakdown for an authorized course trainer or admin
   */
  async getCourseLearnerMastery(courseId, studentId, requestingUser) {
    const supabase = getSupabase();

    // 1. Verify course exists
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    // 2. Authorization check
    const isOwner = course.created_by === requestingUser.id;
    const isPrivileged = requestingUser.role === 'admin' || (requestingUser.role === 'trainer' && isOwner);
    if (!isPrivileged) {
      throw new ForbiddenError('You do not have permission to view learner mastery for this course.');
    }

    // 3. Verify student enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (!enrollment) {
      throw new NotFoundError('Student is not enrolled in this course.');
    }

    // 4. Fetch course concepts (via modules or direct course_id)
    const { data: allModules = [] } = await supabase.from('modules').select('*');
    const courseModules = (allModules || []).filter((m) => m.course_id === courseId);
    const moduleIds = courseModules.map((m) => m.id);

    const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
    const concepts = (allConcepts || []).filter(
      (c) => moduleIds.includes(c.module_id) || c.course_id === courseId
    );

    const { data: allMastery = [] } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId);

    const conceptMastery = (concepts || []).map((c) => {
      const m = (allMastery || []).find((entry) => entry.concept_id === c.id);
      return {
        conceptId: c.id,
        conceptName: c.name,
        description: c.description,
        masteryProbability: m ? Number(m.mastery_probability) : 0.10000,
        evidenceCount: m ? m.evidence_count : 0,
        modelName: m?.model_name || MASTERY_MODELS.BASELINE,
        modelVersion: m?.model_version || 'v1',
        lastEvidenceAt: m?.last_evidence_at || null,
        updatedAt: m?.updated_at || null,
      };
    });

    return {
      courseId,
      studentId,
      concepts: conceptMastery,
      totalConcepts: concepts.length,
      disclaimer: 'Mastery estimates are mathematical approximations based on learning evidence, not a guarantee of ability.',
    };
  },
};
