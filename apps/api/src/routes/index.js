const express = require('express');
const router = express.Router();
const { CONTROLLED_CATEGORIES } = require('../constants/categories');

const guidanceSessions = require('./guidanceSessions');
const referencePackages = require('./referencePackages');
const officialSupportRoutes = require('./officialSupportRoutes');
const adminAnalytics = require('./adminAnalytics');

// GET /api/health
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    service: 'healthcare-guidance-api',
    environment: process.env.NODE_ENV || 'development',
  });
});

// GET /api/categories
router.get('/categories', (req, res) => {
  res.status(200).json({
    total_categories: CONTROLLED_CATEGORIES.length,
    categories: CONTROLLED_CATEGORIES,
    disclaimer: 'Controlled demonstration categories only. Zero clinical triage or symptom analysis.',
  });
});

// Unified Guidance Routes:
// POST /api/guidance/sessions
// POST /api/guidance/search
// POST /api/guidance/official-route
// POST /api/guidance/support-route
// POST /api/guidance/complete
// GET  /api/guidance/sessions/:id
router.use('/guidance', guidanceSessions);

// Reference Packages:
// GET /api/reference-packages
router.use('/reference-packages', referencePackages);

// Official Support Routes:
// GET /api/official-support-routes
router.use('/official-support-routes', officialSupportRoutes);

// Admin Routes:
// requireAdmin authorization boundary is enforced at the router level in adminAnalytics.js.
// For local demonstration only, ALLOW_UNAUTHENTICATED_ADMIN_DEMO=true enables bypass.
// GET /api/admin/analytics/summary
// GET /api/admin/analytics/data-quality
router.use('/admin/analytics', adminAnalytics);

module.exports = router;
