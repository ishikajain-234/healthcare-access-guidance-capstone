const BASE_URL = '/api';

/**
 * Health check
 * GET /api/health
 */
export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

/**
 * Controlled categories
 * GET /api/categories
 */
export async function getCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

/**
 * Initialize anonymous session
 * POST /api/guidance/sessions
 */
export async function startGuidanceSession() {
  const res = await fetch(`${BASE_URL}/guidance/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

/**
 * Search synthetic catalogue by controlled category
 * POST /api/guidance/search
 */
export async function searchReferencePackage(sessionId, categoryId) {
  const res = await fetch(`${BASE_URL}/guidance/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      category_id: categoryId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

/**
 * Advance to official verification route (Found Path)
 * POST /api/guidance/official-route
 */
export async function viewOfficialRoute(sessionId) {
  const res = await fetch(`${BASE_URL}/guidance/official-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

/**
 * Advance to support desk route (Not Found Path)
 * POST /api/guidance/support-route
 */
export async function viewSupportRoute(sessionId) {
  const res = await fetch(`${BASE_URL}/guidance/support-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

/**
 * Complete guidance session
 * POST /api/guidance/complete
 */
export async function completeGuidanceSession(sessionId) {
  const res = await fetch(`${BASE_URL}/guidance/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

/**
 * Retrieve session state and audit timeline
 * GET /api/guidance/sessions/:id
 */
export async function getGuidanceSession(sessionId) {
  const res = await fetch(`${BASE_URL}/guidance/sessions/${sessionId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const getSession = getGuidanceSession;

/**
 * Reference package catalogue
 * GET /api/reference-packages
 */
export async function getReferencePackages() {
  const res = await fetch(`${BASE_URL}/reference-packages`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

/**
 * Official support routes informational card
 * GET /api/official-support-routes
 */
export async function getOfficialSupportRoutes() {
  const res = await fetch(`${BASE_URL}/official-support-routes`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

/**
 * Admin telemetry summary
 * GET /api/admin/analytics/summary
 */
export async function getAdminAnalyticsSummary() {
  const res = await fetch(`${BASE_URL}/admin/analytics/summary`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

/**
 * Admin data quality audit ledger
 * GET /api/admin/analytics/data-quality
 */
export async function getDataQualitySummary() {
  const res = await fetch(`${BASE_URL}/admin/analytics/data-quality`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}
