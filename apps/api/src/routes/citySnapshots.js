const express = require('express');
const router = express.Router();
const citySnapshotController = require('../controllers/citySnapshotController');
const { validateQuery } = require('../middleware/safetyValidator');
const { citySnapshotQuerySchema } = require('../validators/citySnapshotValidators');

// GET /api/city/overview - Latest municipal overview & hospital breakdowns
router.get('/overview', citySnapshotController.getCityOverview);

// GET /api/city/snapshots - Filtered snapshot history
router.get(
  '/snapshots',
  validateQuery(citySnapshotQuerySchema),
  citySnapshotController.listSnapshots
);

module.exports = router;
