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
        // Trainers see published courses and their own courses
        courses = courses.filter((c) => c.status === 'published' || c.created_by === user.id);
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

      res.status(200).json({
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
   * Publish complete extracted curriculum (concepts, quizzes, coding assessments)
   * Connects Teacher Content Upload Studio end-to-end to student experience
   */
  async publishCurriculum(req, res, next) {
    try {
      const extractedData = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const courseTitle = extractedData.courseTitle || 'CS201 Data Structures & Algorithmic Problem Solving (DSA)';

      // 1. Get or create course
      let { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('title', courseTitle)
        .maybeSingle();

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
        await supabase.from('courses').update({ status: 'published' }).eq('id', course.id);
      }

      // Auto-enroll teacher
      await supabase.from('enrollments').insert([
        { course_id: course.id, student_id: user.id, status: 'active' },
      ]);

      // 2. Create Module
      const moduleName = extractedData.moduleName || 'Module 1: Linear Sequence Structures & Buffers';
      const { data: moduleRecord } = await supabase
        .from('modules')
        .insert({
          course_version_id: course.id,
          title: moduleName,
          order_index: 0,
        })
        .select()
        .single();

      const moduleId = moduleRecord?.id || `mod_${Date.now()}`;

      // 3. Persist concepts and learning resources
      let publishedConcepts = 0;
      if (Array.isArray(extractedData.concepts)) {
        for (const c of extractedData.concepts) {
          const { data: conceptRow } = await supabase
            .from('concepts')
            .insert({
              module_id: moduleId,
              name: c.name || c.title,
              description: c.description || c.title,
              status: 'published',
            })
            .select()
            .single();

          if (conceptRow) {
            publishedConcepts++;
            await supabase.from('learning_resources').insert({
              concept_id: conceptRow.id,
              title: c.title || c.name,
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
          const { data: assessment } = await supabase
            .from('assessments')
            .insert({
              course_id: course.id,
              title: `${conceptName}: Topic Mastery Diagnostic Quiz (${qList.length} Questions)`,
              description: `Diagnostic quiz covering ${conceptName}`,
              assessment_type: 'practice',
              status: 'published',
              max_attempts: 10,
              passing_percentage: 70,
              created_by: user.id,
            })
            .select()
            .single();

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
          const { data: assessment } = await supabase
            .from('assessments')
            .insert({
              course_id: course.id,
              title: ca.title || 'Coding Challenge',
              description: ca.description,
              assessment_type: 'practice',
              status: 'published',
              max_attempts: 10,
              passing_percentage: 70,
              created_by: user.id,
            })
            .select()
            .single();

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

