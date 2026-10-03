/**
 * Centralized error handler.
 * Ensures no internal stack traces or database error strings are leaked to client responses.
 */
function errorHandler(err, req, res, next) {
  // Check if body-parser caught a payload size limit or JSON syntax error
  if (err.type === 'entity.too.large' || err instanceof SyntaxError) {
    return res.status(400).json({
      error_code: 'UNSUPPORTED_INPUT',
      message: 'This prototype accepts only the displayed demonstration choices and does not collect personal, identity, or medical information.',
    });
  }

  // Handle custom application errors with specific status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error_code: err.errorCode || 'APPLICATION_ERROR',
      message: err.message,
    });
  }

  console.error('[UNHANDLED API ERROR]', err);
  return res.status(500).json({
    error_code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal error occurred in the prototype.',
  });
}

module.exports = {
  errorHandler,
};
