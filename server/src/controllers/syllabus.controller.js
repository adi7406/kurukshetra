import { getSupabase } from '../integrations/supabase.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

const ALLOWED_FILE_TYPES = ['pdf', 'docx', 'txt', 'json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit per ENVIRONMENT.md

export const syllabusController = {
  /**
   * Get syllabus hierarchy (modules and concepts) for a course
   */
  async getSyllabus(req, res, next) {
    try {
      const { courseId } = req.params;
      const supabase = getSupabase();

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

      const syllabusTree = courseModules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        orderIndex: m.order_index,
        concepts: concepts
          .filter((c) => c.module_id === m.id)
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            orderIndex: c.order_index,
            status: c.status,
          })),
      }));

      res.status(200).json({
        data: {
          courseId,
          courseTitle: course.title,
          modules: syllabusTree,
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
   * Define or update syllabus structure (Modules & Concepts)
   */
  async putSyllabus(req, res, next) {
    try {
      const { courseId } = req.params;
      const { modules = [] } = req.body;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to modify the syllabus for this course.');
      }

      const createdModules = [];

      for (let mIdx = 0; mIdx < modules.length; mIdx++) {
        const m = modules[mIdx];
        const { data: mod } = await supabase
          .from('modules')
          .insert({
            course_id: courseId,
            title: m.title,
            description: m.description || null,
            order_index: m.orderIndex ?? mIdx,
          })
          .select()
          .single();

        const createdConcepts = [];
        if (Array.isArray(m.concepts)) {
          for (let cIdx = 0; cIdx < m.concepts.length; cIdx++) {
            const c = m.concepts[cIdx];
            const { data: con } = await supabase
              .from('concepts')
              .insert({
                module_id: mod.id,
                name: c.name,
                description: c.description || null,
                order_index: c.orderIndex ?? cIdx,
                status: 'draft',
              })
              .select()
              .single();
            createdConcepts.push(con);
          }
        }

        createdModules.push({
          ...mod,
          concepts: createdConcepts,
        });
      }

      res.status(200).json({
        data: {
          courseId,
          modules: createdModules,
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
   * Upload and register syllabus document for extraction (TASK-011)
   */
  async uploadSyllabusDocument(req, res, next) {
    try {
      const { courseId } = req.params;
      const { fileName, fileType, fileSize, content = '' } = req.body;
      const supabase = getSupabase();
      const user = req.user;

      const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (!course) {
        throw new NotFoundError('Course not found.');
      }

      if (course.created_by !== user.id && user.role !== 'admin') {
        throw new ForbiddenError('You do not have permission to upload syllabus documents for this course.');
      }

      // Validate file extension / MIME type
      const normalizedType = (fileType || '').toLowerCase().replace(/^\./, '');
      if (!ALLOWED_FILE_TYPES.includes(normalizedType)) {
        throw new ValidationError(
          `Unsupported file type '${fileType}'. Supported formats: [${ALLOWED_FILE_TYPES.join(', ')}]`
        );
      }

      // Validate file size limit
      if (fileSize && fileSize > MAX_FILE_SIZE) {
        throw new ValidationError(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      }

      const storagePath = `courses/${courseId}/syllabus/${Date.now()}_${fileName}`;

      // Insert tracking record into source_documents
      const { data: doc, error } = await supabase
        .from('source_documents')
        .insert({
          course_id: courseId,
          file_name: fileName,
          file_type: normalizedType,
          file_size: fileSize || 1024,
          storage_path: storagePath,
          extraction_status: 'uploaded',
          source_metadata: {
            uploadedAt: new Date().toISOString(),
            originalFileName: fileName,
          },
          extracted_text: content || 'Extracted syllabus placeholder text.',
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !doc) {
        throw new Error('Failed to record source document.');
      }

      // Return 202 Accepted per API_SPEC.md Section 5.3
      res.status(202).json({
        data: {
          jobId: doc.id,
          documentId: doc.id,
          status: 'uploaded',
          statusUrl: `/api/v1/syllabus-imports/${doc.id}`,
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
   * Get status and extracted metadata of syllabus import
   */
  async getImportStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const supabase = getSupabase();

      const { data: doc } = await supabase.from('source_documents').select('*').eq('id', jobId).maybeSingle();
      if (!doc) {
        throw new NotFoundError('Import job not found.');
      }

      res.status(200).json({
        data: {
          jobId: doc.id,
          courseId: doc.course_id,
          fileName: doc.file_name,
          status: doc.extraction_status,
          extractedTextPreview: doc.extracted_text ? doc.extracted_text.substring(0, 200) : null,
          createdAt: doc.created_at,
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
