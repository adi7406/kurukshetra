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
      const { email, password } = req.body;
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
};
