import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

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
   * Process all evaluated answers from a completed/submitted attempt into normalized learning evidence.
   * Maps question versions to concepts via question_concepts.
   * Ensures idempotent processing so reprocessing never duplicates evidence or inflates mastery.
   * Updates student_mastery and appends to mastery_history.
   */
  async processAttemptEvidence(attemptId) {
    const supabase = getSupabase();

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

    const newProbability = this.calculateNewMastery({
      oldMastery: oldProbability,
      isCorrect,
      alpha: 0.2,
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
      model_name: 'rule_based_baseline',
      model_version: 'v1',
      reason: {
        isCorrect,
        score,
        maxScore,
        alpha: 0.2,
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
        model_name: 'rule_based_baseline',
        model_version: 'v1',
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
    };
  },
};
