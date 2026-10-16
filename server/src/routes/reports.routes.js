import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { reportsController } from '../controllers/reports.controller.js';
import { getSupabase } from '../integrations/supabase.js';

const router = Router();

/**
 * Optional authentication middleware:
 * Attaches req.user if a valid Bearer token is provided, but continues if not.
 */
async function optionalAuthenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return next();
    }

    const supabase = getSupabase();
    const { data: authData } = await supabase.auth.getUser(token);
    if (authData?.user) {
      const user = authData.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, role, metadata')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || 'student';
      req.user = {
        id: user.id,
        email: user.email,
        role,
        profile,
      };
    }
    return next();
  } catch {
    return next();
  }
}

// Reports and Export endpoints
router.post('/reports/export', authenticate, reportsController.createExport);
router.get('/reports/:exportId/download', optionalAuthenticate, reportsController.downloadExport);
router.get('/reports/:exportId', authenticate, reportsController.getReport);
router.get('/reports', authenticate, reportsController.listReports);

export default router;
