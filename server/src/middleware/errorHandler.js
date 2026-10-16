import { AppError } from '../utils/errors.js';

/**
 * Centralized error-handling middleware conforming to API_SPEC.md Section 3.3
 */
export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || 'unknown';

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected internal error occurred.';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    // Malformed JSON body
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON in request body.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload exceeds maximum allowed size.';
  }

  res.locals = res.locals || {};
  res.locals.errorCode = code;

  // In production or test, never leak internal error traces
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[Error] [${requestId}] Unhandled exception:`, err);
  }

  const responsePayload = {
    error: {
      code,
      message,
    },
    meta: {
      requestId,
    },
  };

  if (details) {
    responsePayload.error.details = details;
  }

  res.status(statusCode).json(responsePayload);
}

/**
 * 404 Not Found route handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
    meta: {
      requestId: req.requestId || 'unknown',
    },
  });
}
