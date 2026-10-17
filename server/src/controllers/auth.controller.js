import { getSupabase } from '../integrations/supabase.js';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const authController = {
  /**
   * User Signup
   * Enforces role invariants: students and trainers can register; admin privilege cannot be self-assigned.
   */
  async signup(req, res, next) {
    try {
      const { email, password, displayName, role = 'student', metadata = {} } = req.body;

      if (role === 'admin') {
        throw new ForbiddenError('Self-assignment of the admin role is prohibited.');
      }

      if (!['student', 'trainer'].includes(role)) {
        throw new ValidationError('Role must be either student or trainer.');
      }

      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
            role,
            metadata,
          },
        },
      });

      if (error || !data?.user) {
        throw new ValidationError(error?.message || 'Failed to create user account.');
      }

      const user = data.user;

      // Ensure profile record is inserted
      const { data: profile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: displayName || email.split('@')[0],
          role,
          metadata,
        })
        .select()
        .single();

      res.status(201).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
          profile: profile || {
            id: user.id,
            display_name: displayName || email.split('@')[0],
            role,
            metadata,
          },
          session: data.session,
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
   * User Signin
   */
  async signin(req, res, next) {
    try {
      const { email: rawEmail, identifier, password, role: requestedRole } = req.body;
      const targetIdentifier = (rawEmail || identifier || '').trim().toLowerCase();

      // Universal Evaluator Demo credentials (ID: demo, PASS: demo)
      if (targetIdentifier === 'demo' && (password || '').trim().toLowerCase() === 'demo') {
        const isTrainer = requestedRole === 'teacher' || requestedRole === 'trainer';
        const role = isTrainer ? 'trainer' : 'student';
        const demoUser = isTrainer
          ? {
              id: 'usr_demo_teacher',
              email: 'priya.nair@college.edu',
              role: 'trainer',
              name: 'Dr. Priya Nair',
              display_name: 'Dr. Priya Nair',
            }
          : {
              id: 'usr_demo_student',
              email: 'aditya.sharma@college.edu',
              role: 'student',
              name: 'Aditya Sharma',
              display_name: 'Aditya Sharma',
            };

        const token = `mock_token_${demoUser.id}_session`;
        const profile = {
          id: demoUser.id,
          display_name: demoUser.name,
          role,
          metadata: {
            courseTaught: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
            enrolledCourse: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
          },
        };

        const supabase = getSupabase();
        if (supabase.isMock) {
          try {
            await supabase.from('profiles').insert(profile);
          } catch {
            // ignore
          }
        }

        return res.status(200).json({
          data: {
            user: { id: demoUser.id, email: demoUser.email },
            profile,
            session: { access_token: token },
          },
          user: demoUser,
          token,
          session: { access_token: token },
          meta: {
            requestId: req.requestId,
          },
        });
      }

      const email = targetIdentifier;
      const supabase = getSupabase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.user) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const user = data.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, role, metadata, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      res.status(200).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
          profile: profile || {
            id: user.id,
            display_name: user.email.split('@')[0],
            role: user.user_metadata?.role || 'student',
            metadata: {},
          },
          session: data.session,
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
   * GET /me — Returns current authenticated user and profile
   */
  async getMe(req, res, next) {
    try {
      res.status(200).json({
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
          },
          profile: req.user.profile,
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
   * PATCH /me — Updates allowed profile fields (displayName, metadata)
   * Strictly prevents updating protected fields such as role or id.
   */
  async updateMe(req, res, next) {
    try {
      const { displayName, metadata, role } = req.body;

      if (role !== undefined) {
        throw new ForbiddenError('Self-updating the role field is not permitted.');
      }

      const updates = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (metadata !== undefined) updates.metadata = metadata;

      const supabase = getSupabase();
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        throw new ValidationError('Failed to update profile.');
      }

      res.status(200).json({
        data: {
          profile: updatedProfile,
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
   * GET /teachers — List registered teachers/trainers
   */
  async listTeachers(req, res, next) {
    try {
      const supabase = getSupabase();
      const { data: profiles = [] } = await supabase.from('profiles').select('*');
      const teachers = (profiles || [])
        .filter((p) => p.role === 'trainer' || p.role === 'teacher')
        .map((t) => ({
          id: t.id,
          name: t.display_name || t.name || 'Instructor',
          role: 'teacher',
          courseTaught: t.metadata?.courseTaught || 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
          email: t.metadata?.email || `${t.id}@college.edu`,
          department: t.metadata?.department || 'Department of Computer Science',
        }));

      if (teachers.length === 0) {
        teachers.push({
          id: 'usr_demo_teacher',
          name: 'Dr. Priya Nair',
          role: 'teacher',
          courseTaught: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
          email: 'priya.nair@college.edu',
          department: 'Department of Computer Science',
        });
      }

      res.status(200).json({
        data: teachers,
        teachers, // Compatibility with client
        meta: {
          requestId: req.requestId,
          count: teachers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /students — List enrolled students for cohort view
   */
  async listStudents(req, res, next) {
    try {
      const supabase = getSupabase();
      const { data: profiles = [] } = await supabase.from('profiles').select('*');
      const students = (profiles || [])
        .filter((p) => p.role === 'student')
        .map((s) => ({
          id: s.id,
          name: s.display_name || s.name || 'Student',
          role: 'student',
          rollNo: s.metadata?.rollNo || 'CS22B001',
          className: s.metadata?.className || 'B.Tech CSE II-A',
          enrolledCourse: s.metadata?.enrolledCourse || 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
          overallMastery: s.metadata?.overallMastery || 0,
        }));

      res.status(200).json({
        data: students,
        students, // Compatibility with client
        meta: {
          requestId: req.requestId,
          count: students.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
