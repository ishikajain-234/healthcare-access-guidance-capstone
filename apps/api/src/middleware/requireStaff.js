/**
 * Staff Route Authorization Middleware
 *
 * Enforces an authorization boundary on operational healthcare staff endpoints:
 * - OPD Queue operations (calling, starting, completing, cancelling tokens)
 * - Bed state transitions (reserve, occupy, clean, release, out-of-service, restore)
 * - Inpatient admission coordination (creating, review, assigning bed, confirm, admit, discharge)
 * - Pharmacy/inventory stock operations (receive, issue, adjust, transfer)
 *
 * Role hierarchy:
 * - ADMIN tokens have staff execution privileges.
 * - STAFF tokens have staff execution privileges.
 * - USER / unauthenticated tokens are rejected.
 *
 * Demo bypass:
 * In local development and testing, ALLOW_UNAUTHENTICATED_STAFF_DEMO (defaulting to true in non-production)
 * permits seamless developer workflow and frontend demonstration without login friction.
 * In production (NODE_ENV === 'production'), the bypass is strictly disabled.
 */

const ALLOWED_ADMIN_TOKENS = new Set([
  'demo-admin-token',
  'mock-admin-token',
  'admin-token',
]);

const ALLOWED_STAFF_TOKENS = new Set([
  'demo-staff-token',
  'mock-staff-token',
  'staff-token',
]);

const ALLOWED_USER_TOKENS = new Set([
  'demo-user-token',
  'mock-user-token',
  'user-token',
]);

function requireStaff(req, res, next) {
  // 1. Production enforcement: demo bypass must never be honored in production
  const isProduction = process.env.NODE_ENV === 'production';
  const allowBypass = !isProduction && (
    process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO === 'true' ||
    process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO === undefined
  );

  if (allowBypass) {
    return next();
  }

  // 2. Extract Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message: 'Staff authentication required. Authorization header missing. Provide Bearer token or enable local demo bypass.',
    });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message: 'Staff authentication required. Empty authorization token provided.',
    });
  }

  // 3. Evaluate role privileges (Admin or Staff)
  if (ALLOWED_ADMIN_TOKENS.has(token) || ALLOWED_STAFF_TOKENS.has(token)) {
    req.user = {
      role: ALLOWED_ADMIN_TOKENS.has(token) ? 'ADMIN' : 'STAFF',
      is_staff: true,
      auth_method: 'DEMO_BEARER_TOKEN',
    };
    return next();
  }

  // 4. Authenticated user without staff privileges
  if (ALLOWED_USER_TOKENS.has(token)) {
    return res.status(403).json({
      error_code: 'FORBIDDEN',
      message: 'Staff authorization required. Authenticated user does not possess hospital staff privileges.',
    });
  }

  // 5. Unknown or invalid token format
  return res.status(401).json({
    error_code: 'UNAUTHORIZED',
    message: 'Invalid or unrecognized authorization token.',
  });
}

module.exports = requireStaff;
