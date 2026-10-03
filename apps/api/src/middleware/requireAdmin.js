/**
 * Admin Route Authorization Middleware
 *
 * Enforces an authorization boundary on all /api/admin/* endpoints.
 *
 * CRITICAL SECURITY WARNING:
 * The environment flag ALLOW_UNAUTHENTICATED_ADMIN_DEMO=true provides an explicit bypass
 * SOLELY for local academic demonstration, automated testing, and developer evaluation.
 * THIS BYPASS MUST NEVER BE ENABLED IN STAGING, PRODUCTION, OR ANY ENVIRONMENT CONTAINING SENSITIVE DATA.
 *
 * In non-bypass mode:
 * - Unauthenticated requests (missing Authorization header or token) return HTTP 401 UNAUTHORIZED.
 * - Authenticated non-admin requests return HTTP 403 FORBIDDEN.
 * - Admin-authorized requests return HTTP 200 OK.
 *
 * ZERO-PII / ZERO-CREDENTIAL POLICY:
 * This prototype stores no passwords, Aadhaar, ABHA, phone numbers, or personal user profiles.
 * For Phase 2 evaluation, authorization is validated via standard bearer tokens or mock test fixtures.
 */

const ALLOWED_ADMIN_TOKENS = new Set([
  'demo-admin-token',
  'mock-admin-token',
  'admin-token',
]);

const ALLOWED_USER_TOKENS = new Set([
  'demo-user-token',
  'mock-user-token',
  'user-token',
]);

function requireAdmin(req, res, next) {
  // 1. Check for explicit environment-controlled local demonstration bypass
  const allowBypass = process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO === 'true';

  if (allowBypass) {
    // SECURITY WARNING: Local demo bypass active
    return next();
  }

  // 2. Extract Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message: 'Authentication required. Authorization header missing. Provide Bearer token or enable local demo bypass.',
    });
  }

  // Parse Bearer scheme or raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message: 'Authentication required. Empty authorization token provided.',
    });
  }

  // 3. Evaluate role privileges
  if (ALLOWED_ADMIN_TOKENS.has(token)) {
    req.user = {
      role: 'ADMIN',
      is_admin: true,
      auth_method: 'DEMO_BEARER_TOKEN',
    };
    return next();
  }

  if (ALLOWED_USER_TOKENS.has(token)) {
    return res.status(403).json({
      error_code: 'FORBIDDEN',
      message: 'Admin authorization required. Authenticated user does not possess administrative privileges.',
    });
  }

  // Unknown or invalid token format
  return res.status(401).json({
    error_code: 'UNAUTHORIZED',
    message: 'Invalid or unrecognized authorization token.',
  });
}

module.exports = requireAdmin;
