import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { getSupabase } from '../integrations/supabase.js';

/**
 * Authentication middleware that verifies access token and resolves user profile.
 */
export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. Missing Bearer token.');
    }

    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new UnauthorizedError('Invalid or expired authentication session.');
    }

    const user = authData.user;

    // Fetch user profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, role, metadata, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || user.user_metadata?.role || 'student';

    req.user = {
      id: user.id,
      email: user.email,
      role,
      profile: profile || {
        id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        role,
        metadata: {},
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization middleware enforcing allowed roles.
 *
 * @param  {...string} allowedRoles e.g. 'trainer', 'admin'
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`
        )
      );
    }

    next();
  };
}
