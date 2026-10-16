import { ValidationError } from '../utils/errors.js';

/**
 * Express middleware to validate request params, query, and body using Zod schemas.
 *
 * @param {Object} schemas
 * @param {import('zod').ZodSchema} [schemas.body]
 * @param {import('zod').ZodSchema} [schemas.query]
 * @param {import('zod').ZodSchema} [schemas.params]
 */
export function validateRequest({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (params) {
        req.params = params.parse(req.params);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (body) {
        req.body = body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        }));
        return next(new ValidationError('The request contains invalid fields.', details));
      }
      next(error);
    }
  };
}
