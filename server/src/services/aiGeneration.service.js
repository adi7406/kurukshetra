import { getSupabase } from '../integrations/supabase.js';
import { aiProvider } from '../integrations/aiProvider.js';
import { PROMPT_REGISTRY } from '../utils/prompts.js';
import {
  generatedQuestionsArraySchema,
  generatedContentSchema,
} from '../utils/aiSchemas.js';
import { jobsService } from './jobs.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const aiGenerationService = {
  /**
   * Generates curriculum-aligned draft questions using AI.
   * Questions are strictly saved as 'draft' awaiting trainer review.
   */
  async generateQuestions({
    courseId,
    conceptId = null,
    topic,
    difficulty = 'intermediate',
    count = 2,
    trainerUser,
    useAsyncJob = false,
    idempotencyKey = null,
  }) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may generate questions.');
    }

    const supabase = getSupabase();

    // 1. Verify course existence and ownership
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    if (trainerUser.role !== 'admin' && course.created_by !== trainerUser.id) {
      throw new ForbiddenError('You are not authorized to generate questions for this course.');
    }

    // 2. Resolve concept name if provided
    let conceptName = null;
    if (conceptId) {
      const { data: concept } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', conceptId)
        .maybeSingle();

      if (!concept) {
        throw new NotFoundError('Concept not found.');
      }
      conceptName = concept.name || concept.title;
    }

    // 3. If asynchronous execution requested, dispatch background job
    if (useAsyncJob) {
      const job = await jobsService.createJob({
        type: 'ai_question_generation',
        inputPayload: {
          courseId,
          conceptId,
          topic,
          difficulty,
          count,
        },
        idempotencyKey,
        userId: trainerUser.id,
        runnerFn: async ({ updateProgress }) => {
          await updateProgress(20, 100);
          const result = await this._executeQuestionGeneration({
            courseId,
            conceptId,
            conceptName,
            topic,
            difficulty,
            count,
            trainerUser,
          });
          await updateProgress(100, 100);
          return result;
        },
      });

      return {
        async: true,
        jobId: job.id,
        status: job.status,
      };
    }

    // 4. Synchronous execution
    return this._executeQuestionGeneration({
      courseId,
      conceptId,
      conceptName,
      topic,
      difficulty,
      count,
      trainerUser,
    });
  },

  /**
   * Internal worker logic for generating and persisting draft questions
   */
  async _executeQuestionGeneration({
    courseId,
    conceptId,
    conceptName,
    topic,
    difficulty,
    count,
    trainerUser,
  }) {
    const supabase = getSupabase();

    // 1. Fetch existing question prompts to avoid near-duplicates
    const { data: existingQuestions = [] } = await supabase
      .from('question_versions')
      .select('prompt')
      .limit(10);

    const existingPrompts = (existingQuestions || []).map((q) => q.prompt);

    // 2. Build versioned prompt
    const { systemPrompt, userPrompt } = PROMPT_REGISTRY.QUESTION_GEN.buildPrompt({
      topic,
      conceptName,
      difficulty,
      count,
      existingQuestions: existingPrompts,
    });

    // 3. Call AI provider with schema validation and budget checks
    const { questions: generatedList } = await aiProvider.generateStructuredOutput({
      systemPrompt,
      userPrompt,
      schema: generatedQuestionsArraySchema,
      model: 'gpt-4o-mini',
      userId: trainerUser.id,
      courseId,
      operation: 'ai_question_generation',
    });

    if (!Array.isArray(generatedList) || generatedList.length === 0) {
      throw new ValidationError('AI generation returned an empty question list.');
    }

    const createdDraftQuestions = [];

    for (const q of generatedList) {
      // 4. Create base question identity
      const { data: baseQuestion, error: qErr } = await supabase
        .from('questions')
        .insert({
          course_id: courseId,
          created_by: trainerUser.id,
        })
        .select()
        .single();

      if (qErr || !baseQuestion) {
        throw new Error('Failed to create question identity.');
      }

      // 5. Create draft question version
      const { data: version, error: vErr } = await supabase
        .from('question_versions')
        .insert({
          question_id: baseQuestion.id,
          version_number: 1,
          question_type: q.type,
          title: q.stem.substring(0, 50),
          prompt: q.stem,
          difficulty: q.difficulty || difficulty,
          marks: q.marks || 1,
          explanation: q.explanation || null,
          review_status: 'draft', // MANDATORY: AI-generated questions are strictly drafts
          created_by: trainerUser.id,
        })
        .select()
        .single();

      if (vErr || !version) {
        throw new Error('Failed to create question version.');
      }

      // 6. Map concept if available
      if (conceptId) {
        await supabase.from('question_concepts').insert([
          {
            question_version_id: version.id,
            concept_id: conceptId,
          },
        ]);
      }

      // 7. Save options
      if (Array.isArray(q.options) && q.options.length > 0) {
        const correctSet = new Set(q.correctOptionIds || []);
        const optRows = q.options.map((opt, idx) => ({
          question_version_id: version.id,
          option_key: opt.id,
          option_text: opt.text,
          order_index: idx,
          is_correct: correctSet.has(opt.id),
        }));
        await supabase.from('question_options').insert(optRows);
      }

      // 8. Save protected answer key
      if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        await supabase.from('question_answers').insert({
          question_version_id: version.id,
          answer_type: q.type,
          answer_payload: { correctOptionIds: q.correctOptionIds },
          evaluation_config: { strictMatch: true },
        });
      }

      createdDraftQuestions.push({
        questionId: baseQuestion.id,
        versionId: version.id,
        type: q.type,
        prompt: q.stem,
        difficulty: q.difficulty,
        optionsCount: q.options?.length || 0,
        reviewStatus: 'draft',
        source: 'ai_generated',
      });
    }

    return {
      courseId,
      conceptId,
      totalGenerated: createdDraftQuestions.length,
      questions: createdDraftQuestions,
      requiresTrainerApproval: true,
    };
  },

  /**
   * Generates draft learning content / explanation for a concept using AI.
   * Content is strictly saved as 'draft' awaiting trainer review.
   */
  async generateContent({
    courseId,
    conceptId,
    title = null,
    focusTopic = null,
    difficulty = 'intermediate',
    trainerUser,
    useAsyncJob = false,
    idempotencyKey = null,
  }) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may generate learning content.');
    }

    const supabase = getSupabase();

    // 1. Verify concept
    const { data: concept } = await supabase
      .from('concepts')
      .select('*')
      .eq('id', conceptId)
      .maybeSingle();

    if (!concept) {
      throw new NotFoundError('Concept not found.');
    }

    if (useAsyncJob) {
      const job = await jobsService.createJob({
        type: 'ai_content_generation',
        inputPayload: { courseId, conceptId, title, focusTopic, difficulty },
        idempotencyKey,
        userId: trainerUser.id,
        runnerFn: async ({ updateProgress }) => {
          await updateProgress(20, 100);
          const result = await this._executeContentGeneration({
            courseId,
            concept,
            title: title || concept.title || concept.name,
            focusTopic,
            difficulty,
            trainerUser,
          });
          await updateProgress(100, 100);
          return result;
        },
      });

      return {
        async: true,
        jobId: job.id,
        status: job.status,
      };
    }

    return this._executeContentGeneration({
      courseId,
      concept,
      title: title || concept.title || concept.name,
      focusTopic,
      difficulty,
      trainerUser,
    });
  },

  /**
   * Internal worker logic for generating draft content
   */
  async _executeContentGeneration({ courseId, concept, title, focusTopic, difficulty, trainerUser }) {
    const supabase = getSupabase();

    const { systemPrompt, userPrompt } = PROMPT_REGISTRY.CONTENT_GEN.buildPrompt({
      title,
      conceptName: concept.title || concept.name,
      difficulty,
      focusTopic,
    });

    const contentData = await aiProvider.generateStructuredOutput({
      systemPrompt,
      userPrompt,
      schema: generatedContentSchema,
      model: 'gpt-4o-mini',
      userId: trainerUser.id,
      courseId,
      operation: 'ai_content_generation',
    });

    const { data: resource, error } = await supabase
      .from('learning_resources')
      .insert({
        concept_id: concept.id,
        title: contentData.title,
        resource_type: 'article',
        content: JSON.stringify(contentData),
        difficulty,
        source_type: 'ai_generated',
        review_status: 'draft', // MANDATORY: strictly draft
        version_number: 1,
        created_by: trainerUser.id,
      })
      .select()
      .single();

    if (error || !resource) {
      throw new Error('Failed to create draft learning resource.');
    }

    return {
      resourceId: resource.id,
      conceptId: concept.id,
      title: resource.title,
      reviewStatus: 'draft',
      sourceType: 'ai_generated',
      sectionsCount: contentData.sections?.length || 0,
      requiresTrainerApproval: true,
    };
  },
};
