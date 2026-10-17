import bcrypt from 'bcryptjs';
import { getSupabase } from '../integrations/supabase.js';
import { getPrivilegedSupabaseClient } from '../config/supabase.js';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../utils/errors.js';

function getDbClient(supabase) {
  if (supabase?.isMock) {
    return supabase;
  }
  try {
    return getPrivilegedSupabaseClient();
  } catch {
    return supabase;
  }
}

export const authController = {
  /**
   * User Signup
   * Hashes password with bcrypt, creates user in database, and persists profile.
   */
  async signup(req, res, next) {
    try {
      const {
        email: rawEmail,
        password,
        displayName,
        name,
        role = 'student',
        metadata: directMetadata = {},
        ...restBody
      } = req.body;
      const email = (rawEmail || '').trim().toLowerCase();
      const resolvedDisplayName = (displayName || name || email.split('@')[0] || '').trim();
      const metadata = {
        ...restBody,
        ...directMetadata,
      };

      if (!email || !password) {
        throw new ValidationError('Email and password are required.');
      }

      if (role === 'admin') {
        throw new ForbiddenError('Self-assignment of the admin role is prohibited.');
      }

      if (!['student', 'trainer', 'teacher'].includes(role)) {
        throw new ValidationError('Role must be either student or trainer.');
      }

      const normalizedRole = role === 'teacher' ? 'trainer' : role;

      // 1. Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const supabase = getSupabase();
      let user = null;
      let session = null;
      const dbClient = getDbClient(supabase);

      // Check if user with this email already exists in profiles
      const { data: existingProfiles } = await dbClient
        .from('profiles')
        .select('id, metadata')
        .limit(100);

      const isDuplicate = (existingProfiles || []).some(
        (p) => p.metadata?.email && p.metadata.email.toLowerCase() === email
      );

      if (isDuplicate) {
        throw new ValidationError('A user with this email address already exists.');
      }

      // 2. Create user in auth store
      if (!supabase.isMock && dbClient?.auth?.admin) {
        const { data: adminData, error: adminError } = await dbClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: resolvedDisplayName,
            role: normalizedRole,
            ...metadata,
          },
        });

        if (adminError || !adminData?.user) {
          throw new ValidationError(adminError?.message || 'Failed to create user account.');
        }

        user = adminData.user;

        // Auto sign-in to generate standard session token
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        session = signInData?.session || { access_token: `sb_token_${user.id}_${Date.now()}` };
      } else {
        // Mock / offline fallback
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: resolvedDisplayName,
              role: normalizedRole,
              metadata,
            },
          },
        });

        if (error || !data?.user) {
          throw new ValidationError(error?.message || 'Failed to create user account.');
        }

        user = data.user;
        session = data.session;
      }

      // 3. Persist profile record with bcrypt password hash
      const profileMetadata = {
        ...metadata,
        email,
        password_hash: passwordHash,
      };

      const { data: profile, error: profError } = await dbClient
        .from('profiles')
        .upsert(
          {
            id: user.id,
            display_name: resolvedDisplayName,
            role: normalizedRole,
            metadata: profileMetadata,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (profError) {
        console.error('[Auth] Profile creation error:', profError);
      }

      // Sanitize profile before sending to client (never leak password_hash)
      const sanitizedMetadata = { ...profileMetadata };
      delete sanitizedMetadata.password_hash;

      const sanitizedProfile = {
        id: user.id,
        display_name: profile?.display_name || displayName || email.split('@')[0],
        role: normalizedRole,
        metadata: sanitizedMetadata,
        created_at: profile?.created_at || new Date().toISOString(),
      };

      res.status(201).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: sanitizedProfile.display_name,
            display_name: sanitizedProfile.display_name,
            role: normalizedRole,
          },
          profile: sanitizedProfile,
          session,
        },
        user: {
          id: user.id,
          name: sanitizedProfile.display_name,
          email: user.email,
          role: normalizedRole === 'trainer' ? 'teacher' : 'student',
          ...sanitizedMetadata,
        },
        token: session?.access_token,
        session,
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
   * Verifies password against bcrypt hash in database profiles and Supabase Auth.
   * Completely removes all static/mock evaluator credentials.
   */
  async signin(req, res, next) {
    try {
      const { email: rawEmail, identifier, password, role: requestedRole } = req.body;
      const targetIdentifier = (rawEmail || identifier || '').trim().toLowerCase();

      if (!targetIdentifier || !password) {
        throw new ValidationError('Email and password are required.');
      }

      const email = targetIdentifier;
      const supabase = getSupabase();
      const dbClient = getDbClient(supabase);

      let user = null;
      let session = null;
      let profile = null;

      // 1. Try Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData?.user) {
        user = authData.user;
        session = authData.session;

        // Fetch user profile from database
        const { data: dbProfile } = await dbClient
          .from('profiles')
          .select('id, display_name, role, metadata, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle();

        profile = dbProfile;

        // If bcrypt hash exists, verify with bcrypt
        if (profile?.metadata?.password_hash) {
          const isMatch = await bcrypt.compare(password, profile.metadata.password_hash);
          if (!isMatch) {
            throw new UnauthorizedError('Invalid email or password.');
          }
        }
      } else {
        // 2. Query profiles table directly and verify bcrypt password hash
        const { data: matchingProfiles = [] } = await dbClient
          .from('profiles')
          .select('*');

        const foundProfile = (matchingProfiles || []).find(
          (p) =>
            (p.metadata?.email && p.metadata.email.toLowerCase() === email) ||
            (p.display_name && p.display_name.toLowerCase() === email)
        );

        if (!foundProfile || !foundProfile.metadata?.password_hash) {
          throw new UnauthorizedError('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, foundProfile.metadata.password_hash);
        if (!isMatch) {
          throw new UnauthorizedError('Invalid email or password.');
        }

        profile = foundProfile;
        user = { id: foundProfile.id, email: foundProfile.metadata?.email || email };
        session = { access_token: `sb_token_${foundProfile.id}_${Date.now()}` };
      }

      const role = profile?.role || user?.user_metadata?.role || 'student';

      // Check role mismatch if client explicitly selected a role tab
      if (requestedRole) {
        const normRequested = requestedRole === 'teacher' ? 'trainer' : requestedRole;
        if (normRequested !== role && role !== 'admin') {
          const expectedPortal = role === 'trainer' ? 'Instructor Workspace' : 'Student Portal';
          throw new UnauthorizedError(
            `Role mismatch: This account is registered as a ${role}. Please log in via the ${expectedPortal}.`
          );
        }
      }

      // Strip password hash from returned metadata
      const sanitizedMetadata = { ...(profile?.metadata || {}) };
      delete sanitizedMetadata.password_hash;

      const sanitizedProfile = {
        id: user.id,
        display_name: profile?.display_name || user.email?.split('@')[0],
        role,
        metadata: sanitizedMetadata,
        created_at: profile?.created_at,
      };

      res.status(200).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: sanitizedProfile.display_name,
            display_name: sanitizedProfile.display_name,
            role,
          },
          profile: sanitizedProfile,
          session,
        },
        user: {
          id: user.id,
          name: sanitizedProfile.display_name,
          email: user.email,
          role: role === 'trainer' ? 'teacher' : 'student',
          ...sanitizedMetadata,
        },
        token: session?.access_token,
        session,
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
      const dbClient = getDbClient(supabase);

      const { data: updatedProfile, error } = await dbClient
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
   * GET /teachers — List registered teachers/trainers directly from database
   */
  async listTeachers(req, res, next) {
    try {
      const supabase = getSupabase();
      const dbClient = getDbClient(supabase);

      const { data: profiles = [] } = await dbClient.from('profiles').select('*');
      const teachers = (profiles || [])
        .filter((p) => p.role === 'trainer' || p.role === 'teacher')
        .map((t) => ({
          id: t.id,
          name: t.display_name || t.name || 'Instructor',
          role: 'teacher',
          courseTaught: t.metadata?.courseTaught || 'Core Computer Science',
          email: t.metadata?.email || `${t.id}@college.edu`,
          department: t.metadata?.department || 'Department of Computer Science',
        }));

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
   * GET /students — List enrolled students from database
   */
  async listStudents(req, res, next) {
    try {
      const supabase = getSupabase();
      const dbClient = getDbClient(supabase);

      const { data: profiles = [] } = await dbClient.from('profiles').select('*');
      const students = (profiles || [])
        .filter((p) => p.role === 'student')
        .map((s) => ({
          id: s.id,
          name: s.display_name || s.name || 'Student',
          role: 'student',
          rollNo: s.metadata?.rollNo || '',
          className: s.metadata?.className || '',
          enrolledCourse: s.metadata?.enrolledCourse || '',
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

export default authController;
