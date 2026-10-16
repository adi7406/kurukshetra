import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError } from '../utils/errors.js';
import { masteryService } from './mastery.service.js';

export const gradingService = {
  /**
   * Evaluate and grade all objective questions for an assessment attempt server-side.
   */
  async gradeAttempt(attemptId) {
    const supabase = getSupabase();

    // 1. Fetch attempt and assessment
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) {
      throw new NotFoundError('Attempt not found for grading.');
    }

    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', attempt.assessment_id)
      .maybeSingle();

    if (!assessment) {
      throw new NotFoundError('Assessment not found for grading.');
    }

    // 2. Fetch questions mapped to this assessment
    const { data: mapping = [] } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment.id);

    const questionVersionIds = (mapping || []).map((m) => m.question_version_id);

    const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
    const versions = (allVersions || []).filter((v) => questionVersionIds.includes(v.id));

    // 3. Fetch options and answers
    const { data: allOptions = [] } = await supabase.from('question_options').select('*');
    const { data: allAnswers = [] } = await supabase.from('question_answers').select('*');

    // 4. Fetch student's submitted answers
    const { data: studentAnswers = [] } = await supabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    let totalScore = 0;
    let totalMaxScore = 0;
    const evaluatedItems = [];

    for (const mapItem of mapping) {
      const qVersion = versions.find((v) => v.id === mapItem.question_version_id);
      if (!qVersion) continue;

      const marks = mapItem.marks_override !== null && mapItem.marks_override !== undefined
        ? mapItem.marks_override
        : qVersion.marks;
      totalMaxScore += Number(marks);

      const studentAnsRecord = studentAnswers.find((sa) => sa.question_version_id === qVersion.id);
      const studentPayload = studentAnsRecord?.answer_payload || {};

      let itemScore = 0;
      let isCorrect = false;

      if (qVersion.question_type === 'mcq_single') {
        const opts = (allOptions || []).filter((o) => o.question_version_id === qVersion.id);
        const correctOpt = opts.find((o) => o.is_correct === true);
        const ansRecord = allAnswers.find((a) => a.question_version_id === qVersion.id);
        const expectedKey = correctOpt ? correctOpt.option_key : ansRecord?.answer_payload?.correctOptionKey;

        const selectedKey = Array.isArray(studentPayload.selectedOptionKeys)
          ? studentPayload.selectedOptionKeys[0]
          : studentPayload.selectedOptionKey;

        if (expectedKey && selectedKey && expectedKey.toLowerCase() === selectedKey.toLowerCase()) {
          itemScore = Number(marks);
          isCorrect = true;
        } else if (qVersion.negative_marks && selectedKey) {
          itemScore = -Number(qVersion.negative_marks);
        }
      } else if (qVersion.question_type === 'mcq_multiple') {
        const opts = (allOptions || []).filter((o) => o.question_version_id === qVersion.id);
        const correctKeys = opts.filter((o) => o.is_correct).map((o) => o.option_key.toLowerCase()).sort();
        const selectedKeys = (studentPayload.selectedOptionKeys || []).map((k) => k.toLowerCase()).sort();

        if (JSON.stringify(correctKeys) === JSON.stringify(selectedKeys) && correctKeys.length > 0) {
          itemScore = Number(marks);
          isCorrect = true;
        }
      } else if (qVersion.question_type === 'numeric') {
        const ansRecord = allAnswers.find((a) => a.question_version_id === qVersion.id);
        const expectedValue = ansRecord?.answer_payload?.value;
        const tolerance = ansRecord?.answer_payload?.tolerance || 0;
        const studentValue = Number(studentPayload.value);

        if (expectedValue !== undefined && !isNaN(studentValue)) {
          if (Math.abs(studentValue - expectedValue) <= tolerance) {
            itemScore = Number(marks);
            isCorrect = true;
          }
        }
      } else if (qVersion.question_type === 'short_answer') {
        const ansRecord = allAnswers.find((a) => a.question_version_id === qVersion.id);
        const accepted = (ansRecord?.answer_payload?.acceptedAnswers || [ansRecord?.answer_payload?.text])
          .filter(Boolean)
          .map((t) => t.trim().toLowerCase());
        const studentText = (studentPayload.text || '').trim().toLowerCase();

        if (accepted.includes(studentText)) {
          itemScore = Number(marks);
          isCorrect = true;
        }
      }

      totalScore += itemScore;

      // Update student_answers record
      if (studentAnsRecord) {
        await supabase
          .from('student_answers')
          .update({
            score: itemScore,
            max_score: marks,
            is_correct: isCorrect,
            evaluation_status: 'evaluated',
            evaluated_at: new Date().toISOString(),
          })
          .eq('id', studentAnsRecord.id);
      }

      evaluatedItems.push({
        questionVersionId: qVersion.id,
        questionType: qVersion.question_type,
        marks,
        score: itemScore,
        isCorrect,
      });
    }

    // Scores cannot be negative overall
    const finalScore = Math.max(0, totalScore);
    const percentage = totalMaxScore > 0 ? (finalScore / totalMaxScore) * 100 : 0;
    const passed = percentage >= Number(assessment.passing_percentage);
    const completedAt = new Date().toISOString();

    // 5. Update assessment_attempts
    const { data: updatedAttempt } = await supabase
      .from('assessment_attempts')
      .update({
        status: 'completed',
        score: finalScore,
        max_score: totalMaxScore,
        passed,
        completed_at: completedAt,
      })
      .eq('id', attemptId)
      .select()
      .single();

    // 6. Ingest mastery evidence into the adaptive mastery pipeline
    let masteryIngestion = null;
    try {
      masteryIngestion = await masteryService.processAttemptEvidence(attemptId);
    } catch {
      // Ingestion error should not invalidate grading results
    }

    return {
      attemptId: updatedAttempt.id,
      assessmentId: assessment.id,
      status: updatedAttempt.status,
      score: finalScore,
      maxScore: totalMaxScore,
      percentage: Math.round(percentage * 100) / 100,
      passed,
      completedAt,
      items: evaluatedItems,
      masteryIngestion,
    };
  },
};
