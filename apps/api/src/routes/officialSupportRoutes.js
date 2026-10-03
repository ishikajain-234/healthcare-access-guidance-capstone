const express = require('express');
const router = express.Router();
const officialSupportRouteController = require('../controllers/officialSupportRouteController');

// 8. GET /api/official-support-routes
router.get('/', officialSupportRouteController.getSupportRoutes);

module.exports = router;
