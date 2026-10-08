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

/* ==========================================================================
   Hospital & Hierarchy Services (PS-75)
   ========================================================================== */

/**
 * List all hospitals
 * GET /api/hospitals
 */
export async function getHospitals() {
  const res = await fetch(`${BASE_URL}/hospitals`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch hospitals (${res.status})`);
  }
  return res.json();
}

/**
 * List departments for a hospital
 * GET /api/hospitals/:hospitalId/departments
 */
export async function getHospitalDepartments(hospitalId) {
  const res = await fetch(`${BASE_URL}/hospitals/${encodeURIComponent(hospitalId)}/departments`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch departments (${res.status})`);
  }
  return res.json();
}

/**
 * List wards for a hospital
 * GET /api/hospitals/:hospitalId/wards
 */
export async function getHospitalWards(hospitalId) {
  const res = await fetch(`${BASE_URL}/hospitals/${encodeURIComponent(hospitalId)}/wards`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch wards (${res.status})`);
  }
  return res.json();
}

/**
 * List beds for a hospital (optional ward filter)
 * GET /api/hospitals/:hospitalId/beds
 */
export async function getHospitalBeds(hospitalId, wardId = null) {
  let url = `${BASE_URL}/hospitals/${encodeURIComponent(hospitalId)}/beds`;
  if (wardId) {
    url += `?ward_id=${encodeURIComponent(wardId)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch beds (${res.status})`);
  }
  return res.json();
}

/**
 * Get operational bed availability & occupancy metrics
 * GET /api/hospitals/:hospitalId/beds/availability
 */
export async function getHospitalBedAvailability(hospitalId) {
  const res = await fetch(`${BASE_URL}/hospitals/${encodeURIComponent(hospitalId)}/beds/availability`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch bed availability (${res.status})`);
  }
  return res.json();
}

/* ==========================================================================
   Bed State Transitions (PS-75)
   ========================================================================== */

async function postBedAction(bedId, action) {
  const res = await fetch(`${BASE_URL}/beds/${encodeURIComponent(bedId)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Bed action '${action}' failed (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

export const reserveBed = (bedId) => postBedAction(bedId, 'reserve');
export const occupyBed = (bedId) => postBedAction(bedId, 'occupy');
export const cleanBed = (bedId) => postBedAction(bedId, 'clean');
export const releaseBed = (bedId) => postBedAction(bedId, 'release');
export const outOfServiceBed = (bedId) => postBedAction(bedId, 'out-of-service');
export const restoreBed = (bedId) => postBedAction(bedId, 'restore');

/* ==========================================================================
   OPD Token & Queue Operations (PS-75)
   ========================================================================== */

/**
 * List OPD tokens
 * GET /api/opd/tokens
 */
export async function getOpdTokens({ hospital_id, department_id, counter_id, status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);
  if (department_id) params.set('department_id', department_id);
  if (counter_id) params.set('counter_id', counter_id);
  if (status) params.set('status', status);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  const res = await fetch(`${BASE_URL}/opd/tokens?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch tokens (${res.status})`);
  }
  return res.json();
}

/**
 * Create an anonymous OPD token
 * POST /api/opd/tokens
 */
export async function createOpdToken({ hospital_id, department_id, priority_level = 0 }) {
  const res = await fetch(`${BASE_URL}/opd/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospital_id, department_id, priority_level }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to create OPD token (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/**
 * Call token at counter
 * POST /api/opd/tokens/:tokenId/call
 */
export async function callOpdToken(tokenId, { counter_id }) {
  const res = await fetch(`${BASE_URL}/opd/tokens/${encodeURIComponent(tokenId)}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counter_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to call token (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/**
 * Start service on called token
 * POST /api/opd/tokens/:tokenId/start
 */
export async function startOpdToken(tokenId) {
  const res = await fetch(`${BASE_URL}/opd/tokens/${encodeURIComponent(tokenId)}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to start service (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/**
 * Complete service on in-service token
 * POST /api/opd/tokens/:tokenId/complete
 */
export async function completeOpdToken(tokenId) {
  const res = await fetch(`${BASE_URL}/opd/tokens/${encodeURIComponent(tokenId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to complete token (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/**
 * Cancel a waiting or called token
 * POST /api/opd/tokens/:tokenId/cancel
 */
export async function cancelOpdToken(tokenId) {
  const res = await fetch(`${BASE_URL}/opd/tokens/${encodeURIComponent(tokenId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to cancel token (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/**
 * Get OPD Queue Analytics + M/M/c Benchmark
 * GET /api/opd/analytics
 */
export async function getOpdAnalytics({ hospital_id, department_id, lambda, mu } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);
  if (department_id) params.set('department_id', department_id);
  if (lambda !== undefined && lambda !== null) params.set('lambda', lambda);
  if (mu !== undefined && mu !== null) params.set('mu', mu);

  const res = await fetch(`${BASE_URL}/opd/analytics?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to fetch OPD analytics (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

/* ==========================================================================
   Inpatient Admission Coordination (PS-75)
   ========================================================================== */

/**
 * List Admissions
 * GET /api/admissions
 */
export async function getAdmissions({ hospital_id, ward_id, status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);
  if (ward_id) params.set('ward_id', ward_id);
  if (status) params.set('status', status);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  const res = await fetch(`${BASE_URL}/admissions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch admissions (${res.status})`);
  }
  return res.json();
}

/**
 * Get Single Admission
 * GET /api/admissions/:admissionId
 */
export async function getAdmission(admissionId) {
  const res = await fetch(`${BASE_URL}/admissions/${encodeURIComponent(admissionId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch admission (${res.status})`);
  }
  return res.json();
}

/**
 * Create an admission request (Zero-PII synthetic)
 * POST /api/admissions
 */
export async function createAdmission({ hospital_id, ward_id, linked_token_id = null, notes = null }) {
  const payload = { hospital_id, ward_id };
  if (linked_token_id) payload.linked_token_id = linked_token_id;
  if (notes) payload.notes = notes;

  const res = await fetch(`${BASE_URL}/admissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Failed to create admission (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

async function postAdmissionAction(admissionId, action, body = {}) {
  const res = await fetch(`${BASE_URL}/admissions/${encodeURIComponent(admissionId)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Admission action '${action}' failed (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

export const markAdmissionPendingReview = (admissionId) => postAdmissionAction(admissionId, 'pending-review');
export const assignAdmissionBed = (admissionId, bedId) => postAdmissionAction(admissionId, 'assign-bed', { bed_id: bedId });
export const confirmAdmission = (admissionId) => postAdmissionAction(admissionId, 'confirm');
export const admitPatient = (admissionId) => postAdmissionAction(admissionId, 'admit');
export const dischargePatient = (admissionId) => postAdmissionAction(admissionId, 'discharge');
export const cancelAdmission = (admissionId) => postAdmissionAction(admissionId, 'cancel');

/* ==========================================================================
   Inventory & Supply Chain Services (PS-75)
   ========================================================================== */

/**
 * List inventory items
 * GET /api/inventory/items
 */
export async function getInventoryItems({ hospital_id, item_type, stock_status, is_active, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);
  if (item_type) params.set('item_type', item_type);
  if (stock_status) params.set('stock_status', stock_status);
  if (is_active !== undefined) params.set('is_active', String(is_active));
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  const res = await fetch(`${BASE_URL}/inventory/items?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch inventory items (${res.status})`);
  }
  return res.json();
}

/**
 * Get individual inventory item
 * GET /api/inventory/items/:itemId
 */
export async function getInventoryItem(itemId) {
  const res = await fetch(`${BASE_URL}/inventory/items/${encodeURIComponent(itemId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch inventory item (${res.status})`);
  }
  return res.json();
}

/**
 * Get operational inventory stock availability summary
 * GET /api/inventory/availability
 */
export async function getInventoryAvailability({ hospital_id } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);

  const res = await fetch(`${BASE_URL}/inventory/availability?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch inventory availability (${res.status})`);
  }
  return res.json();
}

async function postInventoryAction(itemId, action, payload = {}) {
  const res = await fetch(`${BASE_URL}/inventory/items/${encodeURIComponent(itemId)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Inventory action '${action}' failed (${res.status})`);
    error.errorCode = err.error_code;
    throw error;
  }
  return res.json();
}

export const receiveStock = (itemId, payload) => postInventoryAction(itemId, 'receive', payload);
export const issueStock = (itemId, payload) => postInventoryAction(itemId, 'issue', payload);
export const adjustStock = (itemId, payload) => postInventoryAction(itemId, 'adjust', payload);
export const transferInStock = (itemId, payload) => postInventoryAction(itemId, 'transfer-in', payload);
export const transferOutStock = (itemId, payload) => postInventoryAction(itemId, 'transfer-out', payload);

/**
 * List inventory transactions
 * GET /api/inventory/transactions
 */
export async function getInventoryTransactions({ hospital_id, item_id, transaction_type, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (hospital_id) params.set('hospital_id', hospital_id);
  if (item_id) params.set('item_id', item_id);
  if (transaction_type) params.set('transaction_type', transaction_type);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  const res = await fetch(`${BASE_URL}/inventory/transactions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch inventory transactions (${res.status})`);
  }
  return res.json();
}

/**
 * Get transactions for a specific item
 * GET /api/inventory/items/:itemId/transactions
 */
export async function getItemTransactions(itemId, { limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);

  const res = await fetch(`${BASE_URL}/inventory/items/${encodeURIComponent(itemId)}/transactions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch item transactions (${res.status})`);
  }
  return res.json();
}


