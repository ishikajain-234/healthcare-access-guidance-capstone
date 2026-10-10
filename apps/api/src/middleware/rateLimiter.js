/**
 * Lightweight In-Memory Rate Limiter Middleware
 *
 * Enforces rate limiting per IP address on public and guidance endpoints.
 * Protects against denial-of-service and automated abuse while remaining
 * fully dependency-free and zero-PII (IP addresses are hashed/stored in-memory only).
 */

const requestCounts = new Map();

// Periodic cleanup of stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Creates an in-memory rate limiter middleware.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Max requests per window per IP (default: 100)
 * @param {string} options.message - Error message when rate limit is exceeded
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || options.max || 200;
  const message = options.message || 'Too many requests from this client. Please try again later.';

  return function rateLimiter(req, res, next) {
    // Skip rate limiting in test environment unless explicitly enabled
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_RATE_LIMIT) {
      return next();
    }

    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = requestCounts.get(clientIp);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestCounts.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error_code: 'RATE_LIMIT_EXCEEDED',
        message,
        retry_after_seconds: resetSeconds,
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};
