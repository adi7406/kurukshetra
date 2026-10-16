import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validatePrerequisitesAcyclic } from '../utils/graph.js';

export const conceptsController = {
  /**
   * List all concepts for a given course
   */
  async listConcepts(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();

      // Check course visibility
      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Fetch modules for this course
      const { data: allModules = [] } = await supabase.from('modules').select('*');
      const courseModules = (allModules || []).filter((m) => m.course_id === courseId || m.course_version_id);
      const moduleIds = courseModules.map((m) => m.id);

      // Fetch concepts
      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const concepts = (allConcepts || []).filter((c) => moduleIds.includes(c.module_id));

      // Fetch prerequisites
      const { data: allPrereqs = [] } = await supabase.from('concept_prerequisites').select('*');

      const enriched = concepts.map((concept) => {
        const prereqs = (allPrereqs || [])
          .filter((p) => p.concept_id === concept.id)
          .map((p) => p.prerequisite_concept_id);
        const parentModule = courseModules.find((m) => m.id === concept.module_id);
        return {
          ...concept,
          moduleTitle: parentModule ? parentModule.title : null,
          prerequisiteIds: prereqs,
        };
      });

      res.status(200).json({
        data: enriched,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new concept (Trainer/Admin)
   */
  async createConcept(req, res, next) {
    try {
      const { courseId } = req.params;
      const { moduleId, name, description, orderIndex = 0 } = req.body;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to manage concepts for this course.');
      }

      // If no moduleId supplied, get or create a default module
      let targetModuleId = moduleId;
      if (!targetModuleId) {
        const { data: existingModules = [] } = await supabase.from('modules').select('*').eq('course_id', courseId);
        if (existingModules && existingModules.length > 0) {
          targetModuleId = existingModules[0].id;
        } else {
          const { data: newMod } = await supabase
            .from('modules')
            .insert({
              course_id: courseId,
              title: 'Module 1: Foundations',
              order_index: 0,
            })
            .select()
            .single();
          targetModuleId = newMod.id;
        }
      }

      const { data: concept, error } = await supabase
        .from('concepts')
        .insert({
          module_id: targetModuleId,
          name,
          description: description || null,
          order_index: orderIndex,
          status: 'draft',
        })
        .select()
        .single();

      if (error || !concept) {
        throw new Error('Failed to create concept.');
      }

      res.status(201).json({
        data: concept,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update an existing concept (Trainer/Admin)
   */
  async updateConcept(req, res, next) {
    try {
      const { conceptId } = req.params;
      const { name, description, orderIndex, status } = req.body;
      const supabase = getSupabase();

      const { data: concept } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
      if (!concept) {
        throw new NotFoundError('Concept not found.');
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (orderIndex !== undefined) updates.order_index = orderIndex;
      if (status !== undefined) updates.status = status;

      const { data: updated } = await supabase
        .from('concepts')
        .update(updates)
        .eq('id', conceptId)
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
   * Set prerequisite dependencies for a concept with cycle and self-link validation.
   */
  async setPrerequisites(req, res, next) {
    try {
      const { conceptId } = req.params;
      const { prerequisiteIds = [] } = req.body;
      const supabase = getSupabase();

      // Verify concept exists
      const { data: concept } = await supabase.from('concepts').select('*').eq('id', conceptId).maybeSingle();
      if (!concept) {
        throw new NotFoundError('Target concept not found.');
      }

      // Verify prerequisite concepts exist
      for (const pId of prerequisiteIds) {
        const { data: prereq } = await supabase.from('concepts').select('*').eq('id', pId).maybeSingle();
        if (!prereq) {
          throw new ValidationError(`Prerequisite concept '${pId}' does not exist.`);
        }
      }

      // Fetch all existing prerequisite edges
      const { data: existingEdges = [] } = await supabase.from('concept_prerequisites').select('*');

      // Validate directed acyclic graph (no self-links and no cycles)
      validatePrerequisitesAcyclic(existingEdges || [], conceptId, prerequisiteIds);

      // Remove previous prerequisite edges for this concept
      await supabase.from('concept_prerequisites').delete().eq('concept_id', conceptId);

      // Insert new prerequisite edges
      const newRows = prerequisiteIds.map((pId) => ({
        concept_id: conceptId,
        prerequisite_concept_id: pId,
        created_by: req.user.id,
      }));

      if (newRows.length > 0) {
        await supabase.from('concept_prerequisites').insert(newRows);
      }

      res.status(200).json({
        data: {
          conceptId,
          prerequisiteIds,
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
   * Get the Concept Graph (nodes and directed edges) for visualization
   */
  async getConceptGraph(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      // Fetch modules and concepts for course
      const { data: allModules = [] } = await supabase.from('modules').select('*');
      const courseModules = (allModules || []).filter((m) => m.course_id === courseId || m.course_version_id);
      const moduleIds = courseModules.map((m) => m.id);

      const { data: allConcepts = [] } = await supabase.from('concepts').select('*');
      const concepts = (allConcepts || []).filter((c) => moduleIds.includes(c.module_id));
      const conceptIds = concepts.map((c) => c.id);

      // Fetch edges between concepts within this course
      const { data: allEdges = [] } = await supabase.from('concept_prerequisites').select('*');
      const edges = (allEdges || [])
        .filter((e) => conceptIds.includes(e.concept_id) && conceptIds.includes(e.prerequisite_concept_id))
        .map((e) => ({
          from: e.prerequisite_concept_id,
          to: e.concept_id,
        }));

      const nodes = concepts.map((c) => {
        const mod = courseModules.find((m) => m.id === c.module_id);
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          moduleId: c.module_id,
          moduleTitle: mod ? mod.title : null,
          status: c.status,
          orderIndex: c.order_index,
        };
      });

      res.status(200).json({
        data: {
          courseId,
          nodes,
          edges,
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
