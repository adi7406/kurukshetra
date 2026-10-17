import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

export const coursesController = {
  /**
   * List courses visible to the authenticated user.
   */
  async listCourses(req, res, next) {
    try {
      const { search, status } = req.query;
      const supabase = getSupabase();
      const user = req.user;

      const { data: rawCourses = [] } = await supabase.from('courses').select('*');
      let courses = Array.isArray(rawCourses) ? [...rawCourses] : [];

      // Visibility rules based on role
      if (user.role === 'student') {
        // Students see published courses and courses they are enrolled in
        const { data: myEnrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);

        const enrolledIds = (myEnrollments || []).map((e) => e.course_id);
        courses = courses.filter((c) => c.status === 'published' || enrolledIds.includes(c.id));
      } else if (user.role === 'trainer') {
        // If trainer has no courses created yet, auto-create their assigned course if available in profile metadata
        const myCourses = courses.filter((c) => c.created_by === user.id);
        if (myCourses.length === 0) {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          const courseTaught = prof?.metadata?.courseTaught;
          if (courseTaught && courseTaught.trim()) {
            const { data: newCourse } = await supabase
              .from('courses')
              .insert({
                title: courseTaught.trim(),
                description: `Curriculum and assessments for ${courseTaught.trim()}`,
                created_by: user.id,
                status: 'draft',
              })
              .select()
              .single();
            if (newCourse) {
              courses.push(newCourse);
            }
          }
        }

        if (req.query.assignedOnly === 'true' || req.query.myCourses === 'true') {
          courses = courses.filter((c) => c.created_by === user.id);
        } else {
          courses = courses.filter((c) => c.status === 'published' || c.created_by === user.id);
        }

        // Sort trainer's own courses first
        courses.sort((a, b) => (b.created_by === user.id ? 1 : 0) - (a.created_by === user.id ? 1 : 0));
      }
      // Admins see all courses

      // Filter by status if specified
      if (status) {
        courses = courses.filter((c) => c.status === status);
      }

      // Filter by search query
      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        courses = courses.filter(
          (c) =>
            (c.title && c.title.toLowerCase().includes(query)) ||
            (c.description && c.description.toLowerCase().includes(query))
        );
      }

      // Hydrate modules & concepts for each course from database
      const { data: allModules = [] } = await supabase.from('modules').select('*');
      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const { data: allResources = [] } = await supabase.from('learning_resources').select('*');

      courses = courses.map((course) => {
        const courseModules = (allModules || [])
          .filter((m) => m.course_id === course.id || m.course_version_id === course.id)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const modulesWithConcepts = courseModules.map((mod) => {
          const modConcepts = (allConcepts || [])
            .filter((c) => c.module_id === mod.id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((c) => {
              const res = (allResources || []).find((r) => r.concept_id === c.id);
              let parsedContent = {};
              if (res?.content) {
                try {
                  parsedContent = JSON.parse(res.content);
                } catch {
                  parsedContent = { coreExplanation: res.content };
                }
              }
              return {
                id: c.id,
                name: c.name,
                title: c.name,
                description: c.description || parsedContent.coreExplanation || '',
                theory: parsedContent.coreExplanation || parsedContent.theory || c.description || '',
                coreExplanation: parsedContent.coreExplanation || c.description || '',
                asciiDiagram: parsedContent.asciiDiagram || '',
                example: parsedContent.workedExamples || parsedContent.example || '',
                workedExamples: parsedContent.workedExamples || '',
                learningObjectives: parsedContent.learningObjectives || [],
                prerequisite: parsedContent.prerequisite || parsedContent.prerequisiteReview || '',
                prerequisiteReview: parsedContent.prerequisiteReview || '',
                diagramType: parsedContent.diagramType || 'tree',
                diagram: parsedContent.diagram || null,
                definitions: parsedContent.definitions || [],
                misconceptions: parsedContent.misconceptions || [],
                keyTakeaways: parsedContent.keyTakeaways || [],
                sections: parsedContent.sections || [],
                masteryScore: c.mastery_score !== undefined ? c.mastery_score : 0.45,
                status: c.status || 'developing',
                orderIndex: c.order_index,
              };
            });
          return {
            ...mod,
            concepts: modConcepts,
          };
        });
        return {
          ...course,
          code: course.code || (course.title.includes('OOP') ? 'CS202' : course.title.includes('OS') ? 'CS301' : 'CS201'),
          instructor: course.instructor || 'Department of Computer Science',
          modules: modulesWithConcepts,
        };
      });

      res.status(200).json({
        data: courses,
        pagination: {
          limit: courses.length,
          hasMore: false,
          nextCursor: null,
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
   * Create a new course (Trainers and Admins only)
   */
  async createCourse(req, res, next) {
    try {
      const { title, description } = req.body;
      const supabase = getSupabase();

      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          title,
          description: description || null,
          created_by: req.user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error || !course) {
        throw new Error('Failed to create course.');
      }

      // Create initial course version 1
      await supabase.from('course_versions').insert({
        course_id: course.id,
        version_number: 1,
        status: 'draft',
        created_by: req.user.id,
      });

      res.status(201).json({
        data: course,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get course details by ID
   */
  async getCourseById(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Scope visibility check: If draft, must be creator, trainer, or admin
      if (course.status === 'draft') {
        const isOwner = course.created_by === user.id;
        const isAdmin = user.role === 'admin';
        if (!isOwner && !isAdmin) {
          throw new NotFoundError('Course not found.');
        }
      }

      // Hydrate modules & concepts
      const { data: allModules = [] } = await supabase.from('modules').select('*').eq('course_id', courseId);
      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const { data: allResources = [] } = await supabase.from('learning_resources').select('*');

      const courseModules = (allModules || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const modulesWithConcepts = courseModules.map((mod) => {
        const modConcepts = (allConcepts || [])
          .filter((c) => c.module_id === mod.id)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((c) => {
            const res = (allResources || []).find((r) => r.concept_id === c.id);
            let parsedContent = {};
            if (res?.content) {
              try { parsedContent = JSON.parse(res.content); } catch { parsedContent = { coreExplanation: res.content }; }
            }
            return {
              id: c.id,
              name: c.name,
              title: c.name,
              description: c.description || parsedContent.coreExplanation || '',
              theory: parsedContent.coreExplanation || parsedContent.theory || c.description || '',
              coreExplanation: parsedContent.coreExplanation || c.description || '',
              asciiDiagram: parsedContent.asciiDiagram || '',
              example: parsedContent.workedExamples || parsedContent.example || '',
              workedExamples: parsedContent.workedExamples || '',
              learningObjectives: parsedContent.learningObjectives || [],
              definitions: parsedContent.definitions || [],
              misconceptions: parsedContent.misconceptions || [],
              keyTakeaways: parsedContent.keyTakeaways || [],
              masteryScore: c.mastery_score !== undefined ? c.mastery_score : 0.45,
              status: c.status || 'developing',
              orderIndex: c.order_index,
            };
          });
        return {
          ...mod,
          concepts: modConcepts,
        };
      });

      const hydratedCourse = {
        ...course,
        code: course.code || (course.title.includes('OOP') ? 'CS202' : course.title.includes('OS') ? 'CS301' : 'CS201'),
        instructor: course.instructor || 'Department of Computer Science',
        modules: modulesWithConcepts,
      };

      res.status(200).json({
        data: hydratedCourse,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update course details
   */
  async updateCourse(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, description } = req.body;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('Only the course creator or an admin can modify this course.');
      }

      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;

      const { data: updatedCourse } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

      res.status(200).json({
        data: updatedCourse,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Publish course
   */
  async publishCourse(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('Only the course creator or an admin can publish this course.');
      }

      const { data: publishedCourse } = await supabase
        .from('courses')
        .update({ status: 'published' })
        .eq('id', courseId)
        .select()
        .single();

      res.status(200).json({
        data: publishedCourse,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Enroll a student in a course
   */
  async enrollStudent(req, res, next) {
    try {
      const { courseId } = req.params;
      const studentId = req.body.studentId || req.user.id;
      const supabase = getSupabase();
      const user = req.user;

      // Authorization: Students can only self-enroll; trainers/admins can enroll other students
      if (user.role === 'student' && studentId !== user.id) {
        throw new ForbiddenError('Students cannot enroll other users.');
      }

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Students cannot enroll in draft courses
      if (course.status !== 'published' && user.role === 'student') {
        throw new ForbiddenError('Cannot enroll in an unpublished course.');
      }

      // Check for existing enrollment
      const { data: existing } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existing) {
        throw new ConflictError('Student is already enrolled in this course.');
      }

      const { data: enrollment } = await supabase
        .from('enrollments')
        .insert({
          course_id: courseId,
          student_id: studentId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      res.status(201).json({
        data: enrollment,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List course enrollments (Trainer or Admin only)
   */
  async listCourseEnrollments(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to view enrollments for this course.');
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId);

      res.status(200).json({
        data: enrollments || [],
        pagination: {
          limit: (enrollments || []).length,
          hasMore: false,
          nextCursor: null,
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
   * List enrollments for the current student
   */
  async listMyEnrollments(req, res, next) {
    try {
      const supabase = getSupabase();
      const user = req.user;

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id);

      res.status(200).json({
        data: enrollments || [],
        pagination: {
          limit: (enrollments || []).length,
          hasMore: false,
          nextCursor: null,
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
   * Get full course curriculum (concepts, learning materials, quizzes, coding assessments)
   * Calculates dynamic counts from persisted records and enforces role-based access.
   */
  async getCourseCurriculum(req, res, next) {
    try {
      const { courseId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      const isOwner = course.created_by === user.id;
      const isPrivileged = user.role === 'admin' || isOwner;

      if (course.status === 'draft' && !isPrivileged) {
        throw new ForbiddenError('This course curriculum is currently in draft and awaiting instructor approval.');
      }

      // 1. Fetch modules for this course
      const { data: allModules = [] } = await supabase.from('modules').select('*');
      const courseModules = (allModules || []).filter(
        (m) => m.course_id === courseId || m.course_version_id === courseId
      );
      const moduleIds = courseModules.map((m) => m.id);

      // 2. Fetch concepts
      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const courseConcepts = (allConcepts || []).filter((c) => moduleIds.includes(c.module_id));
      const conceptIds = courseConcepts.map((c) => c.id);

      // 3. Fetch learning resources
      const { data: allResources = [] } = await supabase.from('learning_resources').select('*');
      const resourcesByConcept = {};
      for (const r of allResources || []) {
        if (conceptIds.includes(r.concept_id)) {
          if (!resourcesByConcept[r.concept_id]) {
            resourcesByConcept[r.concept_id] = [];
          }
          resourcesByConcept[r.concept_id].push(r);
        }
      }

      const formattedConcepts = courseConcepts.map((c) => {
        const resources = resourcesByConcept[c.id] || [];
        const mainResource = resources[0];
        let parsedContent = {};
        if (mainResource?.content) {
          try {
            parsedContent = JSON.parse(mainResource.content);
          } catch {
            parsedContent = { coreExplanation: mainResource.content };
          }
        }

        const parentModule = courseModules.find((m) => m.id === c.module_id);

        return {
          id: c.id,
          name: c.name,
          title: c.name,
          module: parentModule?.title || 'Module 1: Core Fundamentals',
          prerequisite: parsedContent.prerequisite || 'Foundational Programming',
          prerequisiteReview: parsedContent.prerequisiteReview || '',
          theory: parsedContent.coreExplanation || parsedContent.theory || c.description,
          coreExplanation: parsedContent.coreExplanation || parsedContent.theory || c.description,
          asciiDiagram: parsedContent.asciiDiagram || '',
          example: parsedContent.workedExamples || parsedContent.example || '',
          workedExamples: parsedContent.workedExamples || parsedContent.example || '',
          learningObjectives: parsedContent.learningObjectives || [],
          definitions: parsedContent.definitions || [],
          misconceptions: parsedContent.misconceptions || [],
          keyTakeaways: parsedContent.keyTakeaways || [],
          syllabusReference: parsedContent.syllabusReference || '',
          status: c.status,
          reviewStatus: mainResource?.review_status || c.status,
        };
      });

      // 4. Fetch questions (quizzes and coding)
      const { data: allQuestions = [] } = await supabase
        .from('questions')
        .select('*')
        .eq('course_id', courseId);
      const questionIds = (allQuestions || []).map((q) => q.id);

      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const courseVersions = (allVersions || []).filter((v) => questionIds.includes(v.question_id));
      const versionIds = courseVersions.map((v) => v.id);

      // Options
      const { data: allOptions = [] } = await supabase.from('question_options').select('*');
      const courseOptions = (allOptions || []).filter((o) => versionIds.includes(o.question_version_id));

      // Answers (only for trainers/admins!)
      let answersByVersion = {};
      if (isPrivileged) {
        const { data: allAnswers = [] } = await supabase.from('question_answers').select('*');
        for (const a of allAnswers || []) {
          if (versionIds.includes(a.question_version_id)) {
            answersByVersion[a.question_version_id] = a;
          }
        }
      }

      // Test cases
      const { data: allTestCases = [] } = await supabase.from('coding_test_cases').select('*');
      const testCasesByVersion = {};
      for (const tc of allTestCases || []) {
        if (versionIds.includes(tc.question_version_id)) {
          if (!testCasesByVersion[tc.question_version_id]) {
            testCasesByVersion[tc.question_version_id] = [];
          }
          if (isPrivileged || !tc.is_hidden) {
            testCasesByVersion[tc.question_version_id].push({
              input: tc.input_payload,
              expectedOutput: tc.expected_output,
              isHidden: tc.is_hidden,
              weight: tc.weight,
            });
          }
        }
      }

      // Concept mappings
      const { data: allMappings = [] } = await supabase.from('question_concepts').select('*');
      const conceptByVersion = {};
      for (const m of allMappings || []) {
        conceptByVersion[m.question_version_id] = m.concept_id;
      }

      const quizzes = [];
      const codingAssessments = [];

      for (const v of courseVersions) {
        const conceptId = conceptByVersion[v.id];
        const matchedConcept = courseConcepts.find((c) => c.id === conceptId);
        const conceptName = matchedConcept?.name || course.title;

        if (v.question_type === 'mcq_single' || v.question_type === 'mcq_multiple') {
          const options = courseOptions
            .filter((o) => o.question_version_id === v.id)
            .sort((a, b) => a.order_index - b.order_index);

          let correctIndex = 0;
          if (isPrivileged) {
            const correctOptIdx = options.findIndex((o) => o.is_correct);
            if (correctOptIdx >= 0) {
              correctIndex = correctOptIdx;
            } else if (answersByVersion[v.id]?.answer_payload?.correctOptionIndex !== undefined) {
              correctIndex = answersByVersion[v.id].answer_payload.correctOptionIndex;
            }
          }

          quizzes.push({
            id: v.id,
            questionId: v.question_id,
            conceptId: conceptId || null,
            conceptName,
            title: v.title || 'Diagnostic Quiz Item',
            prompt: v.prompt,
            options: options.map((o) => o.option_text),
            correctIndex: isPrivileged ? correctIndex : undefined,
            explanation: isPrivileged ? v.explanation : undefined,
            difficulty: v.difficulty,
            reviewStatus: v.review_status,
          });
        } else if (v.question_type === 'coding') {
          const testCases = testCasesByVersion[v.id] || [];
          const metadata = v.metadata || {};

          codingAssessments.push({
            id: v.id,
            questionId: v.question_id,
            conceptId: conceptId || null,
            conceptName,
            title: v.title || 'Coding Challenge',
            description: v.prompt,
            difficulty: v.difficulty,
            constraints: metadata.constraints || 'Time Limit: 2000ms | Memory Limit: 256MB',
            starterCode: metadata.starterCode || '',
            sampleTests: testCases.filter((tc) => !tc.isHidden),
            hiddenTestsCount: testCases.filter((tc) => tc.isHidden).length,
            vivaQuestion: metadata.vivaQuestion,
            reviewStatus: v.review_status,
          });
        }
      }

      res.status(200).json({
        data: {
          courseId: course.id,
          courseTitle: course.title,
          status: course.status,
          concepts: formattedConcepts,
          quizzes,
          codingAssessments,
          counts: {
            concepts: formattedConcepts.length,
            quizzes: quizzes.length,
            codingAssessments: codingAssessments.length,
          },
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
   * Update an individual curriculum item (concept, quiz question, or coding assessment)
   */
  async updateCourseCurriculum(req, res, next) {
    try {
      const { courseId } = req.params;
      const { itemType, type, itemId, updates = {} } = req.body;
      const resolvedType = itemType || type || (updates?.prompt ? 'quiz' : updates?.title ? 'coding' : 'concept');
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to modify this course curriculum.');
      }

      let updatedRecord = null;

      if (resolvedType === 'concept') {
        const conceptUpdates = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) conceptUpdates.name = updates.name;
        if (updates.description !== undefined) conceptUpdates.description = updates.description;

        const { data } = await supabase
          .from('concepts')
          .update(conceptUpdates)
          .eq('id', itemId)
          .select()
          .maybeSingle();

        // Also update learning resource if content updated
        if (updates.theory || updates.coreExplanation || updates.workedExamples || updates.asciiDiagram) {
          const { data: resList = [] } = await supabase.from('learning_resources').select('*').eq('concept_id', itemId);
          if (resList && resList[0]) {
            let parsed = {};
            try { parsed = JSON.parse(resList[0].content); } catch { /* ignore */ }
            const merged = {
              ...parsed,
              title: updates.name || parsed.title,
              coreExplanation: updates.theory || updates.coreExplanation || parsed.coreExplanation,
              workedExamples: updates.workedExamples || updates.example || parsed.workedExamples,
              asciiDiagram: updates.asciiDiagram || parsed.asciiDiagram,
            };
            await supabase.from('learning_resources').update({ content: JSON.stringify(merged) }).eq('id', resList[0].id);
          }
        }
        updatedRecord = data;
      } else if (resolvedType === 'quiz') {
        const { data } = await supabase
          .from('question_versions')
          .update({
            prompt: updates.prompt,
            explanation: updates.explanation,
            difficulty: updates.difficulty,
          })
          .eq('id', itemId)
          .select()
          .maybeSingle();

        if (updates.options && Array.isArray(updates.options)) {
          for (let idx = 0; idx < updates.options.length; idx++) {
            await supabase
              .from('question_options')
              .update({
                option_text: updates.options[idx],
                is_correct: idx === updates.correctIndex,
              })
              .eq('question_version_id', itemId)
              .eq('order_index', idx);
          }
        }
        updatedRecord = data;
      } else if (itemType === 'coding') {
        const { data } = await supabase
          .from('question_versions')
          .update({
            title: updates.title,
            prompt: updates.description,
            difficulty: updates.difficulty,
          })
          .eq('id', itemId)
          .select()
          .maybeSingle();
        updatedRecord = data;
      }

      res.status(200).json({
        data: updatedRecord || { id: itemId, success: true },
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Publish complete extracted curriculum (concepts, quizzes, coding assessments)
   * Connects Teacher Content Upload Studio end-to-end to student experience
   */
  async publishCurriculum(req, res, next) {
    try {
      const extractedData = req.body?.extractedData || req.body || {};
      const user = req.user;
      const supabase = getSupabase();
      const targetCourseId = req.params.courseId || extractedData.courseId;

      let course = null;
      if (targetCourseId) {
        const { data: c } = await supabase.from('courses').select('*').eq('id', targetCourseId).maybeSingle();
        course = c;
      }

      if (course && course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to publish curriculum for another instructor\'s course.');
      }

      const courseTitle = extractedData.courseTitle || course?.title || 'CS201 Data Structures & Algorithmic Problem Solving (DSA)';

      if (!course) {
        const { data: existing } = await supabase
          .from('courses')
          .select('*')
          .eq('title', courseTitle)
          .maybeSingle();
        course = existing;
      }

      if (!course) {
        const { data: createdCourse } = await supabase
          .from('courses')
          .insert({
            title: courseTitle,
            description: 'Core foundational data structures, algorithmic paradigms, and problem solving.',
            created_by: user.id,
            status: 'published',
          })
          .select()
          .single();
        course = createdCourse;
      } else {
        await supabase.from('courses').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', course.id);
      }

      // Transition any existing draft records for this course to published/approved
      const { data: allModules = [] } = await supabase.from('modules').select('*');
      const courseModules = (allModules || []).filter(
        (m) => m.course_id === course.id || m.course_version_id === course.id
      );
      const moduleIds = courseModules.map((m) => m.id);

      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const courseConcepts = (allConcepts || []).filter((c) => moduleIds.includes(c.module_id));
      for (const c of courseConcepts) {
        await supabase.from('concepts').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', c.id);
      }

      const conceptIds = courseConcepts.map((c) => c.id);
      const { data: allResources = [] } = await supabase.from('learning_resources').select('*');
      const courseResources = (allResources || []).filter((r) => conceptIds.includes(r.concept_id));
      for (const r of courseResources) {
        await supabase.from('learning_resources').update({ review_status: 'approved', updated_at: new Date().toISOString() }).eq('id', r.id);
      }

      const { data: allQuestions = [] } = await supabase.from('questions').select('*').eq('course_id', course.id);
      const questionIds = (allQuestions || []).map((q) => q.id);
      const { data: allVersions = [] } = await supabase.from('question_versions').select('*');
      const courseVersions = (allVersions || []).filter((v) => questionIds.includes(v.question_id));
      for (const v of courseVersions) {
        await supabase.from('question_versions').update({ review_status: 'approved' }).eq('id', v.id);
      }

      const { data: allAssessments = [] } = await supabase.from('assessments').select('*').eq('course_id', course.id);
      for (const a of allAssessments || []) {
        await supabase.from('assessments').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', a.id);
      }

      // Auto-enroll teacher and all registered students so they can immediately access curriculum in real-time
      const { data: allProfiles = [] } = await supabase
        .from('profiles')
        .select('id, role, metadata');

      const enrolledStudentIds = (allProfiles || [])
        .filter((p) => p.role === 'student')
        .map((p) => p.id);

      const enrollmentsToCreate = [
        { course_id: course.id, student_id: user.id, status: 'active' },
        ...enrolledStudentIds.map((sid) => ({
          course_id: course.id,
          student_id: sid,
          status: 'active',
        })),
      ];

      for (const enr of enrollmentsToCreate) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', enr.course_id)
          .eq('student_id', enr.student_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('enrollments').insert(enr);
        }
      }

      // 2. Create or reuse Module
      const moduleName = extractedData.moduleName || 'Module 1: Linear Sequence Structures & Buffers';
      const { data: existingCourseModules = [] } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id);

      let moduleRecord = (existingCourseModules || []).find((m) => m.title === moduleName);
      if (!moduleRecord) {
        const { data: createdMod } = await supabase
          .from('modules')
          .insert({
            course_id: course.id,
            course_version_id: course.id,
            title: moduleName,
            order_index: 0,
          })
          .select()
          .single();
        moduleRecord = createdMod;
      }

      const moduleId = moduleRecord?.id || `mod_${Date.now()}`;

      // 3. Persist concepts and learning resources
      let publishedConcepts = 0;
      const conceptRowMap = {};

      if (Array.isArray(extractedData.concepts)) {
        for (const c of extractedData.concepts) {
          const cName = c.name || c.title;
          const { data: existingConcept } = await supabase
            .from('concepts')
            .select('*')
            .eq('module_id', moduleId)
            .eq('name', cName)
            .maybeSingle();

          let conceptRow = existingConcept;
          if (!conceptRow) {
            const { data: newRow } = await supabase
              .from('concepts')
              .insert({
                module_id: moduleId,
                name: cName,
                description: c.description || c.theory || cName,
                status: 'published',
              })
              .select()
              .single();
            conceptRow = newRow;
          } else {
            await supabase
              .from('concepts')
              .update({ status: 'published', description: c.description || c.theory || cName })
              .eq('id', conceptRow.id);
          }

          if (conceptRow) {
            publishedConcepts++;
            conceptRowMap[cName] = conceptRow.id;
            if (c.id) conceptRowMap[c.id] = conceptRow.id;

            // Upsert learning resource
            const { data: existingRes } = await supabase
              .from('learning_resources')
              .select('id')
              .eq('concept_id', conceptRow.id)
              .maybeSingle();

            if (existingRes) {
              await supabase
                .from('learning_resources')
                .update({
                  title: cName,
                  content: JSON.stringify(c),
                  review_status: 'published',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingRes.id);
            } else {
              await supabase.from('learning_resources').insert({
                concept_id: conceptRow.id,
                title: cName,
                resource_type: 'article',
                content: JSON.stringify(c),
                difficulty: c.difficulty || 'intermediate',
                source_type: 'trainer_authored',
                review_status: 'published',
                version_number: 1,
                created_by: user.id,
              });
            }
          }
        }
      }

      // 4. Persist quizzes as published assessments
      let publishedQuizzes = 0;
      if (Array.isArray(extractedData.quizzes) && extractedData.quizzes.length > 0) {
        const grouped = {};
        extractedData.quizzes.forEach((q) => {
          const key = q.conceptName || 'General';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(q);
        });

        for (const [conceptName, qList] of Object.entries(grouped)) {
          const quizTitle = `${conceptName}: Topic Mastery Diagnostic Quiz (${qList.length} Questions)`;
          const { data: existingQuiz } = await supabase
            .from('assessments')
            .select('id')
            .eq('course_id', course.id)
            .eq('title', quizTitle)
            .maybeSingle();

          let assessment = existingQuiz;
          if (!assessment) {
            const { data: createdAssess } = await supabase
              .from('assessments')
              .insert({
                course_id: course.id,
                title: quizTitle,
                description: `Diagnostic quiz covering ${conceptName}`,
                assessment_type: 'practice',
                status: 'published',
                max_attempts: 10,
                passing_percentage: 70,
                created_by: user.id,
              })
              .select()
              .single();
            assessment = createdAssess;
          }

          if (assessment) {
            publishedQuizzes++;
            for (const q of qList) {
              const { data: baseQ } = await supabase
                .from('questions')
                .insert({ course_id: course.id, created_by: user.id })
                .select()
                .single();

              if (baseQ) {
                const { data: qv } = await supabase
                  .from('question_versions')
                  .insert({
                    question_id: baseQ.id,
                    version_number: 1,
                    question_type: 'mcq_single',
                    title: q.prompt ? q.prompt.substring(0, 50) : 'Quiz Question',
                    prompt: q.prompt,
                    difficulty: 'intermediate',
                    marks: 1,
                    explanation: q.explanation || null,
                    review_status: 'published',
                    created_by: user.id,
                  })
                  .select()
                  .single();

                if (qv) {
                  await supabase.from('assessment_questions').insert({
                    assessment_id: assessment.id,
                    question_version_id: qv.id,
                  });

                  const targetConceptId = conceptRowMap[conceptName] || conceptRowMap[q.conceptId] || Object.values(conceptRowMap)[0];
                  if (targetConceptId) {
                    await supabase.from('question_concepts').insert({
                      question_version_id: qv.id,
                      concept_id: targetConceptId,
                    });
                  }

                  if (Array.isArray(q.options)) {
                    await supabase.from('question_options').insert(
                      q.options.map((opt, idx) => ({
                        question_version_id: qv.id,
                        option_key: String(idx),
                        option_text: opt,
                        is_correct: idx === q.correctIndex,
                        order_index: idx,
                      }))
                    );

                    await supabase.from('question_answers').insert({
                      question_version_id: qv.id,
                      answer_type: 'mcq_single',
                      answer_payload: { correctOptionIndex: q.correctIndex },
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 5. Persist coding assessments
      let publishedCoding = 0;
      if (Array.isArray(extractedData.codingAssessments)) {
        for (const ca of extractedData.codingAssessments) {
          const codingTitle = ca.title || 'Coding Challenge';
          const { data: existingCoding } = await supabase
            .from('assessments')
            .select('id')
            .eq('course_id', course.id)
            .eq('title', codingTitle)
            .maybeSingle();

          let assessment = existingCoding;
          if (!assessment) {
            const { data: createdCoding } = await supabase
              .from('assessments')
              .insert({
                course_id: course.id,
                title: codingTitle,
                description: ca.description,
                assessment_type: 'practice',
                status: 'published',
                max_attempts: 10,
                passing_percentage: 70,
                created_by: user.id,
              })
              .select()
              .single();
            assessment = createdCoding;
          }

          if (assessment) {
            publishedCoding++;
            const { data: baseQ } = await supabase
              .from('questions')
              .insert({ course_id: course.id, created_by: user.id })
              .select()
              .single();

            if (baseQ) {
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
                    starterCode: {
                      python: ca.starterCode,
                      javascript: `// Implement solution for ${ca.title}\nfunction solve(input) {\n  // TODO\n}`,
                    },
                    constraints: ca.constraints,
                    vivaQuestion: ca.vivaQuestion,
                  },
                  review_status: 'published',
                  created_by: user.id,
                })
                .select()
                .single();

              if (qv) {
                await supabase.from('assessment_questions').insert({
                  assessment_id: assessment.id,
                  question_version_id: qv.id,
                });

                const targetConceptId = conceptRowMap[ca.conceptName] || conceptRowMap[ca.conceptId] || Object.values(conceptRowMap)[0];
                if (targetConceptId) {
                  await supabase.from('question_concepts').insert({
                    question_version_id: qv.id,
                    concept_id: targetConceptId,
                  });
                }

                if (Array.isArray(ca.sampleTests)) {
                  await supabase.from('coding_test_cases').insert(
                    ca.sampleTests.map((st, idx) => ({
                      question_version_id: qv.id,
                      input_payload: st.input,
                      expected_output: st.expectedOutput,
                      is_hidden: false,
                      weight: 1,
                      order_index: idx,
                    }))
                  );
                }
              }
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          courseId: course.id,
          status: 'published',
          publishedConceptsCount: publishedConcepts,
          publishedQuizzesCount: publishedQuizzes,
          publishedCodingCount: publishedCoding,
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

