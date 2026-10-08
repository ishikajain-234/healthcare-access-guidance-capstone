/**
 * Endpoint Safety Validation Middleware
 * Enforces per-endpoint strict schema validation with unknown-key rejection.
 * Rejects free-text, prohibited clinical/personal fields, and out-of-schema attributes with HTTP 400 UNSUPPORTED_INPUT.
 */

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body || {});
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const errorDetails = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error_code: 'UNSUPPORTED_INPUT',
          message: 'Request payload validation failed. Ensure no extra, free-text, or unvalidated keys are present.',
          details: errorDetails,
        });
      }
      next(err);
    }
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          error_code: 'INVALID_PARAMETERS',
          message: 'URL path parameters failed validation.',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      next(err);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query || {});
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const errorDetails = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error_code: 'UNSUPPORTED_INPUT',
          message: 'Query parameter validation failed. Ensure no extra, invalid, or out-of-range parameters are present.',
          details: errorDetails,
        });
      }
      next(err);
    }
  };
}

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
};
