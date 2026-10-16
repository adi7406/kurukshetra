import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export const resourcesController = {
  /**
   * List resources for a concept.
   * If caller is a student, returns only approved resources.
   * If caller is trainer or admin, returns all resources including drafts.
   */
  async listResourcesForConcept(req, res, next) {
    try {
      const { conceptId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      // Verify concept exists
      const { data: concept } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
      if (!concept) {
        throw new NotFoundError('Concept not found.');
      }

      const { data: allResources = [] } = await supabase.from('learning_resources').select('*').eq('concept_id', conceptId);

      // Filter by role permissions
      const isPrivileged = user.role === 'trainer' || user.role === 'admin';
      const visible = (allResources || []).filter((r) => {
        if (isPrivileged) return true;
        return r.review_status === 'approved';
      });

      res.status(200).json({
        data: visible,
        meta: {
          requestId: req.requestId,
          count: visible.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new learning resource (Trainer/Admin)
   */
  async createResource(req, res, next) {
    try {
      const { conceptId } = req.params;
      const {
        title,
        resourceType,
        content = null,
        url = null,
        difficulty = 'intermediate',
        sourceType = 'trainer',
        reviewStatus = 'draft',
      } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: concept } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
      if (!concept) {
        throw new NotFoundError('Concept not found.');
      }

      const { data: resource, error } = await supabase
        .from('learning_resources')
        .insert({
          concept_id: conceptId,
          title,
          resource_type: resourceType,
          content,
          url,
          difficulty,
          source_type: sourceType,
          review_status: reviewStatus,
          version_number: 1,
          created_by: user.id,
          approved_by: reviewStatus === 'approved' ? user.id : null,
        })
        .select()
        .single();

      if (error || !resource) {
        throw new Error('Failed to create learning resource.');
      }

      res.status(201).json({
        data: resource,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a learning resource (Trainer/Admin)
   */
  async updateResource(req, res, next) {
    try {
      const { resourceId } = req.params;
      const { title, content, url, difficulty, reviewStatus } = req.body;
      const user = req.user;
      const supabase = getSupabase();

      const { data: existing } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('id', resourceId)
        .maybeSingle();

      if (!existing) {
        throw new NotFoundError('Resource not found.');
      }

      if (existing.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to modify this resource.');
      }

      const updates = {
        version_number: existing.version_number + 1,
      };
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (url !== undefined) updates.url = url;
      if (difficulty !== undefined) updates.difficulty = difficulty;
      if (reviewStatus !== undefined) {
        updates.review_status = reviewStatus;
        if (reviewStatus === 'approved') {
          updates.approved_by = user.id;
        }
      }

      const { data: updated } = await supabase
        .from('learning_resources')
        .update(updates)
        .eq('id', resourceId)
        .select()
        .single();

      res.status(200).json({
        data: updated,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Publish a draft learning resource (Trainer/Admin)
   */
  async publishResource(req, res, next) {
    try {
      const { resourceId } = req.params;
      const user = req.user;
      const supabase = getSupabase();

      const { data: existing } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('id', resourceId)
        .maybeSingle();

      if (!existing) {
        throw new NotFoundError('Resource not found.');
      }

      if (existing.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to publish this resource.');
      }

      const { data: updated } = await supabase
        .from('learning_resources')
        .update({
          review_status: 'approved',
          approved_by: user.id,
        })
        .eq('id', resourceId)
        .select()
        .single();

      res.status(200).json({
        data: updated,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
