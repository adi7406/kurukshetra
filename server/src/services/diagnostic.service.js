import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../integrations/supabase.js';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors.js';
import { recommendationsService } from './recommendations.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load curriculum syllabi dataset
const curriculumPath = path.resolve(__dirname, '../data/curriculum_syllabi.json');
let curriculumData = null;

function getCurriculumData() {
  if (!curriculumData) {
    const raw = fs.readFileSync(curriculumPath, 'utf8');
    curriculumData = JSON.parse(raw);
  }
  return curriculumData;
}

export const diagnosticService = {
  /**
   * Determine student's initial placement tier based on subject score out of 10:
   * 0 - 5: beginner
   * 6 - 8: intermediate
   * 9 - 10: advanced
   */
  calculatePlacement(score) {
    if (score >= 9) return 'advanced';
    if (score >= 6) return 'intermediate';
    return 'beginner';
  },

  /**
   * Check if student has already completed the first-login diagnostic onboarding
   */
  async getDiagnosticStatus(studentId) {
    const supabase = getSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', studentId)
      .maybeSingle();

    const metadata = profile?.metadata || {};
    const isCompleted = Boolean(metadata.diagnostic_completed);

    return {
      completed: isCompleted,
      completedAt: metadata.diagnostic_completed_at || null,
      results: metadata.diagnostic_results || null,
    };
  },

  /**
   * Retrieve the 30-question diagnostic assessment:
   * - 10 MCQs from Object-Oriented Programming (Java)
   * - 10 MCQs from Data Structures & Algorithms (Python)
   * - 10 MCQs from Operating Systems (C)
   * Answer keys are strictly redacted to prevent cheating.
   */
  async getDiagnosticAssessment(studentId) {
    const status = await this.getDiagnosticStatus(studentId);
    if (status.completed) {
      return {
        alreadyCompleted: true,
        completedAt: status.completedAt,
        results: status.results,
        sections: [],
      };
    }

    const data = getCurriculumData();
    const sections = [];

    for (const subject of data.subjects) {
      const subjectQuestions = [];
      for (const topic of subject.topics) {
        for (const mcq of topic.mcqs) {
          subjectQuestions.push({
            id: mcq.id,
            subjectId: subject.id,
            subjectTitle: subject.title,
            topicId: topic.id,
            topicName: topic.name,
            stem: mcq.stem,
            options: mcq.options.map((opt) => ({
              id: opt.id,
              text: opt.text,
            })),
            marks: 1,
          });
        }
      }

      // Take first 10 questions per subject for deterministic diagnostic test
      sections.push({
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectTitle: subject.title,
        language: subject.language,
        questionCount: 10,
        questions: subjectQuestions.slice(0, 10),
      });
    }

    const totalQuestions = sections.reduce((sum, sec) => sum + sec.questions.length, 0);

    return {
      alreadyCompleted: false,
      title: 'First-Login Diagnostic Assessment',
      description: 'Initial 30-mark diagnostic across OOP, DSA, and OS to determine your baseline knowledge and tailor your personal learning path.',
      totalQuestions,
      maxScore: totalQuestions,
      sections,
    };
  },

  /**
   * Submit and grade the first-login diagnostic assessment:
   * - Evaluates answers strictly server-side
   * - Calculates subject scores out of 10 independently
   * - Assigns beginner / intermediate / advanced placement per subject
   * - Prevents duplicate submissions and duplicate mastery updates
   * - Updates initial student_mastery and records initial recommendations
   */
  async submitDiagnosticAssessment({ studentId, answers = [] }) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ValidationError('Answers array is required and cannot be empty.');
    }

    const supabase = getSupabase();

    // 1. Check if already completed
    const currentStatus = await this.getDiagnosticStatus(studentId);
    if (currentStatus.completed) {
      throw new ConflictError('First-login diagnostic has already been completed.');
    }

    // 2. Build answer lookup map from syllabus dataset
    const data = getCurriculumData();
    const answerKeyMap = new Map();
    const subjectTopicMap = new Map();

    for (const subject of data.subjects) {
      for (const topic of subject.topics) {
        for (const mcq of topic.mcqs) {
          answerKeyMap.set(mcq.id, {
            subjectId: subject.id,
            subjectTitle: subject.title,
            topicId: topic.id,
            topicName: topic.name,
            correctOptionIds: mcq.correctOptionIds,
            explanation: mcq.explanation,
          });
        }
      }
    }

    // 3. Grade answers per subject
    const subjectScores = {
      'subject-oop': { correct: 0, total: 10, title: 'Object-Oriented Programming' },
      'subject-dsa': { correct: 0, total: 10, title: 'Data Structures & Algorithms' },
      'subject-os': { correct: 0, total: 10, title: 'Operating Systems' },
    };

    const gradedAnswers = [];
    const submittedIds = new Set();

    for (const item of answers) {
      if (!item.questionId || submittedIds.has(item.questionId)) continue;
      submittedIds.add(item.questionId);

      const qInfo = answerKeyMap.get(item.questionId);
      if (!qInfo) continue;

      const isCorrect = Array.isArray(qInfo.correctOptionIds)
        ? qInfo.correctOptionIds.includes(item.selectedOptionId)
        : qInfo.correctOptionIds === item.selectedOptionId;

      if (subjectScores[qInfo.subjectId]) {
        if (isCorrect) {
          subjectScores[qInfo.subjectId].correct++;
        }
      }

      gradedAnswers.push({
        questionId: item.questionId,
        subjectId: qInfo.subjectId,
        isCorrect,
        selectedOptionId: item.selectedOptionId,
      });
    }

    // 4. Calculate subject placements and total score
    let totalScore = 0;
    const placements = {};

    for (const [subjId, info] of Object.entries(subjectScores)) {
      totalScore += info.correct;
      const placementTier = this.calculatePlacement(info.correct);
      placements[subjId] = {
        title: info.title,
        score: info.correct,
        maxScore: info.total,
        percentage: Math.round((info.correct / info.total) * 100),
        placement: placementTier,
        description:
          placementTier === 'advanced'
            ? 'Advanced placement: Strong conceptual foundation. Ready for advanced topics and design patterns.'
            : placementTier === 'intermediate'
            ? 'Intermediate placement: Good foundational grasp with specific prerequisite areas to reinforce.'
            : 'Beginner placement: Foundation building recommended. Starting with core primitives and invariant mechanics.',
      };
    }

    const diagnosticResults = {
      totalScore,
      maxScore: 30,
      percentage: Math.round((totalScore / 30) * 100),
      subjects: {
        oop: placements['subject-oop'],
        dsa: placements['subject-dsa'],
        os: placements['subject-os'],
      },
      completedAt: new Date().toISOString(),
      summary: `Diagnostic completed with ${totalScore}/30. Placements: OOP (${placements['subject-oop'].placement}), DSA (${placements['subject-dsa'].placement}), OS (${placements['subject-os'].placement}).`,
    };

    // 5. Persist completion to student profile metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', studentId)
      .maybeSingle();

    const updatedMetadata = {
      ...(profile?.metadata || {}),
      diagnostic_completed: true,
      diagnostic_completed_at: diagnosticResults.completedAt,
      diagnostic_results: diagnosticResults,
    };

    await supabase
      .from('profiles')
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    // 6. Initialize baseline concept mastery for student based on diagnostic tiers
    const initialMasteryByTier = {
      beginner: 0.20,
      intermediate: 0.50,
      advanced: 0.80,
    };

    // Fetch existing concepts in database if populated
    const { data: dbConcepts = [] } = await supabase.from('concepts').select('id, name');
    if (dbConcepts && dbConcepts.length > 0) {
      for (const concept of dbConcepts) {
        // Map concept to tier
        const conceptLower = (concept.name || '').toLowerCase();
        let targetTier = 'beginner';
        if (conceptLower.includes('object') || conceptLower.includes('inherit') || conceptLower.includes('abstract')) {
          targetTier = placements['subject-oop']?.placement || 'beginner';
        } else if (conceptLower.includes('array') || conceptLower.includes('stack') || conceptLower.includes('tree')) {
          targetTier = placements['subject-dsa']?.placement || 'beginner';
        } else if (conceptLower.includes('process') || conceptLower.includes('sync') || conceptLower.includes('memory')) {
          targetTier = placements['subject-os']?.placement || 'beginner';
        }

        const initialProb = initialMasteryByTier[targetTier] || 0.20;

        await supabase.from('student_mastery').upsert(
          {
            student_id: studentId,
            concept_id: concept.id,
            mastery_probability: initialProb,
            evidence_count: 1,
            model_name: 'diagnostic_onboarding',
            model_version: 'v1',
            last_evidence_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,concept_id' }
        );
      }
    }

    return diagnosticResults;
  },
};
