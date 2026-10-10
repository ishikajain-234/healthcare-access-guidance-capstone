const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bedController');
const { validateParams, validateBody } = require('../middleware/safetyValidator');
const requireStaff = require('../middleware/requireStaff');
const { bedIdParamSchema, emptyOrReasonSchema } = require('../validators/bedValidators');

// Operational staff authorization boundary for all bed state transitions
router.use(requireStaff);

// POST /api/beds/:bedId/reserve (AVAILABLE -> RESERVED)
router.post(
  '/:bedId/reserve',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.reserve
);

// POST /api/beds/:bedId/occupy (RESERVED -> OCCUPIED)
router.post(
  '/:bedId/occupy',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.occupy
);

// POST /api/beds/:bedId/clean (OCCUPIED -> CLEANING)
router.post(
  '/:bedId/clean',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.clean
);

// POST /api/beds/:bedId/release (CLEANING or RESERVED -> AVAILABLE)
router.post(
  '/:bedId/release',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.release
);

// POST /api/beds/:bedId/out-of-service (AVAILABLE -> OUT_OF_SERVICE)
router.post(
  '/:bedId/out-of-service',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.outOfService
);

// POST /api/beds/:bedId/restore (OUT_OF_SERVICE -> AVAILABLE)
router.post(
  '/:bedId/restore',
  validateParams(bedIdParamSchema),
  validateBody(emptyOrReasonSchema),
  bedController.restore
);

module.exports = router;
