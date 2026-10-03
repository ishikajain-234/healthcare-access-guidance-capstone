const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const requireAdmin = require('../middleware/requireAdmin');

/**
 * SECURITY WARNING:
 * All endpoints under /api/admin/* are protected by the requireAdmin authorization boundary.
 * For local academic demonstration, ALLOW_UNAUTHENTICATED_ADMIN_DEMO=true may be set in .env.
 * THIS BYPASS MUST NEVER BE ENABLED IN STAGING OR PRODUCTION.
 */
router.use(requireAdmin);

// GET /api/admin/analytics/summary
router.get('/summary', adminAnalyticsController.getSummary);

// GET /api/admin/analytics/data-quality
router.get('/data-quality', adminAnalyticsController.getDataQuality);

module.exports = router;
