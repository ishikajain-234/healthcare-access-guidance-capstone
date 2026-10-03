const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');

/**
 * SECURITY WARNING:
 * All endpoints under /api/admin/* are currently unauthenticated ONLY for local academic
 * demonstration and evaluation. Before any staging or production deployment, robust
 * role-based authorization (e.g. JWT with an explicit ADMIN role verification middleware)
 * MUST be enforced to restrict access to operational telemetry and data quality logs.
 */

// GET /api/admin/analytics/summary
router.get('/summary', adminAnalyticsController.getSummary);

// GET /api/admin/analytics/data-quality
router.get('/data-quality', adminAnalyticsController.getDataQuality);

module.exports = router;
