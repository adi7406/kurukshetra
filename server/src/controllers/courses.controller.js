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

      let courses = await supabase.from('courses').select('*');

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
};
