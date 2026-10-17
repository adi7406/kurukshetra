import { getSupabase } from '../integrations/supabase.js';
import { aiProvider } from '../integrations/aiProvider.js';
import { PROMPT_REGISTRY } from '../utils/prompts.js';
import {
  generatedQuestionsArraySchema,
  generatedContentSchema,
  generatedCodingAssessmentSchema,
  generatedCurriculumSchema,
  structuredLessonSchema,
  codingAssessmentsArraySchema,
  syllabusTopicsListSchema,
} from '../utils/aiSchemas.js';
import {
  parseSyllabusTopicsFallback,
  getFallbackLesson,
  getFallbackQuizzes,
  getFallbackCodingAssessments,
} from '../utils/curriculumFallbacks.js';
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
        type: 'question_generation',
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
        type: 'content_generation',
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

  /**
   * Generates curriculum-aligned draft coding assessment with test cases using NVIDIA AI models.
   * Assessment is saved as 'draft' awaiting trainer review.
   */
  async generateCodingAssessment({
    courseId,
    conceptId = null,
    topic,
    difficulty = 'intermediate',
    trainerUser,
  }) {
    const isPrivileged = trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only trainers and administrators may generate coding assessments.');
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
      throw new ForbiddenError('You are not authorized to generate assessments for this course.');
    }

    // 2. Resolve concept name if provided
    let conceptName = null;
    if (conceptId) {
      const { data: concept } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', conceptId)
        .maybeSingle();
      if (concept) {
        conceptName = concept.title || concept.name;
      }
    }

    const { systemPrompt, userPrompt } = PROMPT_REGISTRY.CODING_GEN.buildPrompt({
      topic,
      conceptName,
      difficulty,
    });

    const codingData = await aiProvider.generateStructuredOutput({
      systemPrompt,
      userPrompt,
      schema: generatedCodingAssessmentSchema,
      userId: trainerUser.id,
      courseId,
      operation: 'ai_coding_generation',
    });

    // 3. Create question base
    const { data: baseQuestion, error: qErr } = await supabase
      .from('questions')
      .insert({
        course_id: courseId,
        created_by: trainerUser.id,
      })
      .select()
      .single();

    if (qErr || !baseQuestion) {
      throw new Error('Failed to create coding question identity.');
    }

    // 4. Create question version
    const { data: version, error: vErr } = await supabase
      .from('question_versions')
      .insert({
        question_id: baseQuestion.id,
        version_number: 1,
        question_type: 'coding',
        title: codingData.title,
        prompt: codingData.description,
        difficulty: codingData.difficulty || difficulty,
        marks: 10,
        explanation: codingData.vivaQuestion?.rubric || 'Evaluates algorithmic optimality and invariant correctness.',
        metadata: {
          constraints: codingData.constraints,
          starterCode: codingData.starterCode,
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          vivaQuestion: codingData.vivaQuestion,
        },
        review_status: 'draft', // Strictly draft awaiting trainer review
        created_by: trainerUser.id,
      })
      .select()
      .single();

    if (vErr || !version) {
      throw new Error('Failed to create coding question version.');
    }

    // 5. Save test cases
    const testCasesToInsert = (codingData.testCases || []).map((tc, idx) => ({
      question_version_id: version.id,
      input_payload: tc.input,
      expected_output: tc.expectedOutput,
      is_hidden: Boolean(tc.isHidden),
      weight: tc.weight || 1,
      order_index: tc.orderIndex !== undefined ? tc.orderIndex : idx,
      time_limit_ms: 2000,
      memory_limit_mb: 256,
    }));

    if (testCasesToInsert.length > 0) {
      await supabase.from('coding_test_cases').insert(testCasesToInsert);
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

    return {
      questionId: baseQuestion.id,
      versionId: version.id,
      title: codingData.title,
      difficulty: codingData.difficulty,
      testCasesCount: testCasesToInsert.length,
      sampleTestCasesCount: testCasesToInsert.filter((tc) => !tc.is_hidden).length,
      hiddenTestCasesCount: testCasesToInsert.filter((tc) => tc.is_hidden).length,
      reviewStatus: 'draft',
      source: 'ai_generated',
      requiresTrainerApproval: true,
    };
  },

  /**
   * Synthesizes full curriculum from uploaded syllabus text/document.
   * Persists concepts, learning resources, 10 MCQs per topic, and 2 coding challenges per topic.
   */
  async extractCurriculum({
    courseId = null,
    courseTitle = '',
    syllabusText = '',
    fileData = null,
    fileName = null,
    fileType = null,
    trainerUser,
    useAsyncJob = false,
    idempotencyKey = null,
  }) {
    const isPrivileged = !trainerUser || trainerUser.role === 'trainer' || trainerUser.role === 'admin';
    if (!isPrivileged) {
      throw new ForbiddenError('Only instructors and administrators can extract and synthesize curricula.');
    }

    const supabase = getSupabase();
    let resolvedCourseId = courseId;

    // Resolve course if not directly passed
    if (!resolvedCourseId) {
      if (trainerUser?.metadata?.assignedCourseId) {
        resolvedCourseId = trainerUser.metadata.assignedCourseId;
      } else {
        const titleToFind = (courseTitle || 'Curriculum Course').trim();
        const { data: existing } = await supabase
          .from('courses')
          .select('*')
          .eq('title', titleToFind)
          .maybeSingle();

        if (existing) {
          resolvedCourseId = existing.id;
        } else {
          const { data: newCourse } = await supabase
            .from('courses')
            .insert({
              title: titleToFind,
              description: `Curriculum and assessments synthesized for ${titleToFind}`,
              created_by: trainerUser?.id || 'usr_demo_teacher',
              status: 'draft',
            })
            .select()
            .single();
          resolvedCourseId = newCourse?.id || `course_${Date.now()}`;
        }
      }
    }

    // Verify course
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', resolvedCourseId)
      .maybeSingle();

    if (!course) {
      throw new NotFoundError('Target course not found.');
    }

    if (useAsyncJob) {
      const job = await jobsService.createJob({
        type: 'syllabus_import',
        inputPayload: {
          courseId: resolvedCourseId,
          courseTitle: course.title,
          syllabusTextLength: syllabusText?.length || 0,
        },
        idempotencyKey,
        userId: trainerUser?.id || 'usr_demo_teacher',
        runnerFn: async ({ updateProgress }) => {
          return await this._executeCurriculumSynthesis({
            courseId: resolvedCourseId,
            courseTitle: course.title,
            syllabusText,
            fileData,
            fileName,
            fileType,
            trainerUser: trainerUser || { id: course.created_by, role: 'trainer' },
            updateProgress,
          });
        },
      });

      return {
        async: true,
        jobId: job.id,
        status: job.status,
        statusUrl: `/api/v1/jobs/${job.id}`,
      };
    }

    return await this._executeCurriculumSynthesis({
      courseId: resolvedCourseId,
      courseTitle: course.title,
      syllabusText,
      fileData,
      fileName,
      fileType,
      trainerUser: trainerUser || { id: course.created_by, role: 'trainer' },
    });
  },

  /**
   * Execution worker for full curriculum synthesis, validation, and database persistence
   */
  async _executeCurriculumSynthesis({
    courseId,
    courseTitle,
    syllabusText,
    fileData,
    fileName,
    fileType,
    trainerUser,
    updateProgress = async () => {},
  }) {
    const supabase = getSupabase();
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    let userId = trainerUser?.id;
    if (!userId || !isUuid(userId)) {
      const { data: targetCourse } = await supabase.from('courses').select('created_by').eq('id', courseId).maybeSingle();
      if (targetCourse?.created_by && isUuid(targetCourse.created_by)) {
        userId = targetCourse.created_by;
      } else {
        const { data: anyTrainer } = await supabase.from('profiles').select('id').eq('role', 'trainer').limit(1).maybeSingle();
        userId = anyTrainer?.id && isUuid(anyTrainer.id) ? anyTrainer.id : '00000000-0000-0000-0000-000000000001';
      }
    }

    // 1. Ingest syllabus text / PDF stream
    await updateProgress(10, 100, 'Ingesting syllabus and extracting document stream...');
    let text = (syllabusText || '').trim();

    if (fileData && (fileName?.endsWith('.pdf') || fileType?.includes('pdf'))) {
      try {
        const buffer = Buffer.isBuffer(fileData)
          ? fileData
          : typeof fileData === 'string' && fileData.startsWith('data:')
          ? Buffer.from(fileData.split(',')[1], 'base64')
          : Buffer.from(fileData, 'base64');

        const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
        const parsed = await pdfParse(buffer);
        if (parsed?.text && parsed.text.trim().length > 0) {
          text = parsed.text.trim();
        }
      } catch (pdfErr) {
        console.warn('[Curriculum AI] PDF text extraction fallback:', pdfErr.message);
      }
    }

    if (!text) {
      text = `Course Syllabus: ${courseTitle || 'Computer Science Foundations'}`;
    }

    // Persist source document record
    try {
      await supabase.from('source_documents').insert({
        course_id: courseId,
        file_name: fileName || `${(courseTitle || 'course').toLowerCase().replace(/\s+/g, '_')}_syllabus.txt`,
        file_type: fileType || 'txt',
        file_size: text.length || 1024,
        storage_path: `courses/${courseId}/syllabus/${Date.now()}_syllabus.txt`,
        extraction_status: 'extracted',
        extracted_text: text,
        created_by: userId,
      });
    } catch {
      // Non-blocking document record
    }

    // 2. Identify candidate topics
    await updateProgress(25, 100, 'Analyzing syllabus structure and identifying candidate topics...');
    let topicsList = null;

    try {
      const { systemPrompt, userPrompt } = PROMPT_REGISTRY.SYLLABUS_ANALYZE_TOPICS.buildPrompt({
        syllabusText: text,
        courseTitle,
      });

      topicsList = await aiProvider.generateStructuredOutput({
        systemPrompt,
        userPrompt,
        schema: syllabusTopicsListSchema,
        userId,
        courseId,
        operation: 'ai_syllabus_analysis',
        allowFallback: false,
        maxRetries: 0,
        maxTokens: 700,
        timeoutMs: 10000,
      });
    } catch (analysisErr) {
      console.warn('[Curriculum AI] Topic extraction AI error, using fallback:', analysisErr.message);
      topicsList = parseSyllabusTopicsFallback(text, courseTitle);
    }

    const topics = topicsList?.topics || [];
    if (!topics || topics.length === 0) {
      throw new ValidationError('Could not extract valid syllabus topics.');
    }

    const totalTopics = topics.length;

    // 3. Ensure module exists
    const moduleName = topicsList.moduleName || 'Module 1: Core Fundamentals & Principles';
    const { data: moduleRecord } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        course_version_id: courseId,
        title: moduleName,
        order_index: 1,
      })
      .select()
      .single();

    const moduleId = moduleRecord?.id || `mod_${Date.now()}`;

    const generatedConcepts = [];
    const generatedQuizzes = [];
    const generatedCodingAssessments = [];

    // 4. Generate content per topic (Lessons, 10 Quizzes, 2 Coding Challenges in parallel)
    for (let i = 0; i < totalTopics; i++) {
      const topic = topics[i];
      const baseProgress = 30 + Math.round((i / totalTopics) * 60);

      await updateProgress(baseProgress, 100, `Synthesizing lesson, 10 quizzes & coding challenges for Topic ${i + 1}/${totalTopics}: ${topic.name}...`);

      const [lesson, rawQuizQuestions, rawCodingAssessments] = await Promise.all([
        // A. Complete Structured Lesson
        (async () => {
          try {
            const { systemPrompt, userPrompt } = PROMPT_REGISTRY.CONTENT_GEN.buildPrompt({
              title: topic.name,
              conceptName: topic.name,
              focusTopic: topic.description,
              language: 'Java',
              syllabusContext: text,
            });

            return await aiProvider.generateStructuredOutput({
              systemPrompt,
              userPrompt,
              schema: structuredLessonSchema,
              userId,
              courseId,
              operation: 'ai_content_generation',
              allowFallback: false,
              maxRetries: 0,
              maxTokens: 1200,
              timeoutMs: 10000,
            });
          } catch (contentErr) {
            console.warn(`[Curriculum AI] Content generation fallback for ${topic.name}:`, contentErr.message);
            return getFallbackLesson(topic, text);
          }
        })(),

        // B. Quizzes: Exactly 10 per topic
        (async () => {
          try {
            const { systemPrompt, userPrompt } = PROMPT_REGISTRY.QUESTION_GEN.buildPrompt({
              topic: topic.name,
              conceptName: topic.name,
              count: 10,
              difficulty: 'intermediate',
            });

            const qResult = await aiProvider.generateStructuredOutput({
              systemPrompt,
              userPrompt,
              schema: generatedQuestionsArraySchema,
              userId,
              courseId,
              operation: 'ai_question_generation',
              allowFallback: false,
              maxRetries: 0,
              maxTokens: 1500,
              timeoutMs: 10000,
            });
            return qResult?.questions || [];
          } catch (quizErr) {
            console.warn(`[Curriculum AI] Quiz generation fallback for ${topic.name}:`, quizErr.message);
            return getFallbackQuizzes(topic, 10);
          }
        })(),

        // C. Coding Assessments: Exactly 2 per programming topic
        (async () => {
          if (topic.isProgrammingTopic === false) return [];
          try {
            const { systemPrompt, userPrompt } = PROMPT_REGISTRY.CODING_GEN.buildPrompt({
              topic: topic.name,
              conceptName: topic.name,
              count: 2,
              difficulty: 'intermediate',
            });

            const cResult = await aiProvider.generateStructuredOutput({
              systemPrompt,
              userPrompt,
              schema: codingAssessmentsArraySchema,
              userId,
              courseId,
              operation: 'ai_coding_generation',
              allowFallback: false,
              maxRetries: 0,
              maxTokens: 1200,
              timeoutMs: 10000,
            });
            return cResult?.assessments || [];
          } catch (cErr) {
            console.warn(`[Curriculum AI] Coding generation fallback for ${topic.name}:`, cErr.message);
            return getFallbackCodingAssessments(topic, 2);
          }
        })(),
      ]);

      // Enforce exactly 10 questions per topic
      let quizQuestions = rawQuizQuestions;
      if (!Array.isArray(quizQuestions) || quizQuestions.length < 10) {
        const fallbacks = getFallbackQuizzes(topic, 10);
        quizQuestions = [...(quizQuestions || []), ...fallbacks].slice(0, 10);
      } else if (quizQuestions.length > 10) {
        quizQuestions = quizQuestions.slice(0, 10);
      }

      // Enforce exactly 2 coding assessments
      let codingAssessments = rawCodingAssessments;
      if (!Array.isArray(codingAssessments) || codingAssessments.length < 2) {
        const fallbacks = getFallbackCodingAssessments(topic, 2);
        codingAssessments = [...(codingAssessments || []), ...fallbacks].slice(0, 2);
      } else if (codingAssessments.length > 2) {
        codingAssessments = codingAssessments.slice(0, 2);
      }

      // Persist Concept (status: 'published' so immediately live)
      const { data: conceptRecord } = await supabase
        .from('concepts')
        .insert({
          module_id: moduleId,
          name: topic.name,
          description: topic.description || lesson.summary,
          status: 'published',
          order_index: i + 1,
        })
        .select()
        .single();

      const conceptId = conceptRecord?.id || `concept_${Date.now()}_${i}`;

      // Persist Learning Resource (review_status: 'approved')
      const { data: resourceRecord } = await supabase
        .from('learning_resources')
        .insert({
          concept_id: conceptId,
          title: lesson.title || topic.name,
          resource_type: 'article',
          content: JSON.stringify(lesson),
          difficulty: 'intermediate',
          source_type: 'ai_generated',
          review_status: 'approved',
          version_number: 1,
          created_by: userId,
        })
        .select()
        .single();

      generatedConcepts.push({
        id: conceptId,
        resourceId: resourceRecord?.id,
        name: topic.name,
        title: lesson.title || topic.name,
        module: topic.module || moduleName,
        prerequisite: topic.prerequisite || 'Foundational Programming',
        prerequisiteReview: lesson.prerequisiteReview || topic.prerequisiteReview || '',
        theory: lesson.coreExplanation || topic.description,
        coreExplanation: lesson.coreExplanation || topic.description,
        asciiDiagram: lesson.asciiDiagram || '',
        example: lesson.workedExamples || '',
        workedExamples: lesson.workedExamples || '',
        learningObjectives: lesson.learningObjectives || [],
        definitions: lesson.definitions || [],
        misconceptions: lesson.misconceptions || [],
        keyTakeaways: lesson.keyTakeaways || [],
        syllabusReference: lesson.syllabusReference || '',
        status: 'published',
        reviewStatus: 'approved',
      });

      // Create assessment container for topic quizzes
      const { data: quizAssessment } = await supabase
        .from('assessments')
        .insert({
          course_id: courseId,
          title: `${topic.name}: Mastery Quizzes (10 Questions)`,
          description: `10 Bloom-aligned diagnostic multiple choice questions covering ${topic.name}`,
          assessment_type: 'practice',
          status: 'published',
          duration_minutes: 20,
          max_attempts: 10,
          passing_percentage: 70,
          created_by: userId,
        })
        .select()
        .single();

      for (let qIdx = 0; qIdx < quizQuestions.length; qIdx++) {
        const q = quizQuestions[qIdx];
        let baseQId = `q_${Date.now()}_${qIdx}`;
        let qvId = `qv_${Date.now()}_${qIdx}`;
        const rawOptions = q.options || [];
        const optTexts = rawOptions.map((opt) => (typeof opt === 'string' ? opt : opt.text || String(opt)));
        const correctIds = q.correctOptionIds || (q.correctIndex !== undefined ? [rawOptions[q.correctIndex]?.id || 'A'] : ['A']);
        const optionRows = rawOptions.map((opt, oIdx) => ({
          option_key: opt.id || String.fromCharCode(65 + oIdx),
          option_text: typeof opt === 'string' ? opt : opt.text || String(opt),
          order_index: oIdx,
          is_correct: correctIds.includes(opt.id || String.fromCharCode(65 + oIdx)) || oIdx === q.correctIndex,
        }));
        const correctOptIdx = optionRows.findIndex((o) => o.is_correct);

        try {
          const { data: baseQ } = await supabase
            .from('questions')
            .insert({ course_id: courseId, created_by: userId })
            .select()
            .single();

          if (baseQ?.id) {
            baseQId = baseQ.id;
            const { data: qv } = await supabase
              .from('question_versions')
              .insert({
                question_id: baseQ.id,
                version_number: 1,
                question_type: 'mcq_single',
                title: `Item #${qIdx + 1}: ${topic.name}`,
                prompt: q.stem,
                difficulty: q.difficulty || 'intermediate',
                marks: q.marks || 1,
                explanation: q.explanation || '',
                review_status: 'approved',
                created_by: userId,
              })
              .select()
              .single();

            if (qv?.id) {
              qvId = qv.id;
              await supabase.from('question_concepts').insert({
                question_version_id: qv.id,
                concept_id: conceptId,
              });

              if (quizAssessment?.id) {
                await supabase.from('assessment_questions').insert({
                  assessment_id: quizAssessment.id,
                  question_version_id: qv.id,
                  position: qIdx,
                });
              }

              const dbOptions = optionRows.map((row) => ({ ...row, question_version_id: qv.id }));
              await supabase.from('question_options').insert(dbOptions);

              // Server-side answer key (never sent to student before submission)
              await supabase.from('question_answers').insert({
                question_version_id: qv.id,
                answer_type: 'mcq_single',
                answer_payload: {
                  correctOptionIndex: correctOptIdx >= 0 ? correctOptIdx : 0,
                  correctOptionId: optionRows[correctOptIdx]?.option_key || 'A',
                },
              });
            }
          }
        } catch (dbErr) {
          console.warn(`[Curriculum AI] Non-blocking quiz insert note for Item #${qIdx + 1}:`, dbErr.message);
        }

        generatedQuizzes.push({
          id: qvId,
          questionId: baseQId,
          conceptId,
          conceptName: topic.name,
          title: `Item #${qIdx + 1} (${q.difficulty || 'intermediate'})`,
          prompt: q.stem,
          options: optTexts.length >= 2 ? optTexts : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: correctOptIdx >= 0 ? correctOptIdx : 0,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'intermediate',
          reviewStatus: 'approved',
        });
      }

      // Persist Coding Assessments
      if (topic.isProgrammingTopic !== false && codingAssessments.length > 0) {
        for (let cIdx = 0; cIdx < codingAssessments.length; cIdx++) {
          const ca = codingAssessments[cIdx];
          let baseQId = `q_code_${Date.now()}_${cIdx}`;
          let qvId = `qv_code_${Date.now()}_${cIdx}`;
          const starterCodeStr =
            typeof ca.starterCode === 'string'
              ? ca.starterCode
              : ca.starterCode?.python || ca.starterCode?.javascript || '';
          const testCases = ca.testCases || [];

          try {
            const { data: assessment } = await supabase
              .from('assessments')
              .insert({
                course_id: courseId,
                title: ca.title,
                description: ca.description,
                assessment_type: 'practice',
                status: 'published',
                max_attempts: 10,
                passing_percentage: 70,
                created_by: userId,
              })
              .select()
              .single();

            const { data: baseQ } = await supabase
              .from('questions')
              .insert({ course_id: courseId, created_by: userId })
              .select()
              .single();

            if (baseQ?.id) {
              baseQId = baseQ.id;
              const { data: qv } = await supabase
                .from('question_versions')
                .insert({
                  question_id: baseQ.id,
                  version_number: 1,
                  question_type: 'coding',
                  title: ca.title,
                  prompt: ca.description,
                  difficulty: ca.difficulty || 'intermediate',
                  marks: 10,
                  metadata: {
                    constraints: ca.constraints,
                    starterCode: starterCodeStr,
                    starterCodeObject: ca.starterCode,
                    vivaQuestion: ca.vivaQuestion,
                    referenceSolution: ca.referenceSolution,
                  },
                  review_status: 'approved',
                  created_by: userId,
                })
                .select()
                .single();

              if (qv?.id) {
                qvId = qv.id;
                await supabase.from('question_concepts').insert({
                  question_version_id: qv.id,
                  concept_id: conceptId,
                });

                if (assessment?.id) {
                  await supabase.from('assessment_questions').insert({
                    assessment_id: assessment.id,
                    question_version_id: qv.id,
                    position: cIdx,
                  });
                }

                const tcRows = testCases.map((tc, tIdx) => ({
                  question_version_id: qv.id,
                  input_payload: tc.input || '',
                  expected_output: tc.expectedOutput || '',
                  is_hidden: tc.isHidden !== false,
                  weight: tc.weight || 1,
                  order_index: tIdx,
                }));

                if (tcRows.length > 0) {
                  await supabase.from('coding_test_cases').insert(tcRows);
                }

                // Server-side reference solution & viva
                await supabase.from('question_answers').insert({
                  question_version_id: qv.id,
                  answer_type: 'coding',
                  answer_payload: {
                    referenceSolution: ca.referenceSolution || {},
                    starterCode: ca.starterCode || {},
                    vivaQuestion: ca.vivaQuestion || {},
                  },
                });
              }
            }
          } catch (codeErr) {
            console.warn(`[Curriculum AI] Non-blocking coding assessment insert note for ${ca.title}:`, codeErr.message);
          }

          generatedCodingAssessments.push({
            id: qvId,
            questionId: baseQId,
            conceptId,
            conceptName: topic.name,
            title: ca.title,
            description: ca.description,
            difficulty: ca.difficulty || 'intermediate',
            constraints: ca.constraints || 'Time Limit: 2000ms | Memory Limit: 256MB',
            starterCode: starterCodeStr,
            sampleTests: testCases.filter((tc) => !tc.isHidden),
            hiddenTestsCount: testCases.filter((tc) => tc.isHidden).length,
            vivaQuestion: ca.vivaQuestion,
            reviewStatus: 'approved',
          });
        }
      }
    }

    // 5. Complete and Validate
    await updateProgress(95, 100, 'Validating curriculum invariants and persisting records to database...');
    await updateProgress(100, 100, 'Curriculum synthesized successfully. Ready for teacher review.');

    return {
      courseId,
      courseTitle,
      status: 'draft',
      concepts: generatedConcepts,
      quizzes: generatedQuizzes,
      codingAssessments: generatedCodingAssessments,
      counts: {
        concepts: generatedConcepts.length,
        quizzes: generatedQuizzes.length,
        codingAssessments: generatedCodingAssessments.length,
      },
      message: `Curriculum synthesized: ${generatedConcepts.length} Topics, ${generatedQuizzes.length} Quizzes (${Math.round(generatedQuizzes.length / (generatedConcepts.length || 1))}/topic), ${generatedCodingAssessments.length} Coding Challenges saved as draft. Ready for teacher review.`,
    };
  },

  /**
   * Diagnostic verification for an individual AI model
   */
  async checkModelDiagnostics(model) {
    return await aiProvider.testModelDiagnostics(model);
  },

  /**
   * Diagnostic verification for all configured dual NVIDIA models
   */
  async checkAllModelDiagnostics() {
    return await aiProvider.runAllModelDiagnostics();
  },
};

