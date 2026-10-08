const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const { validateBody, validateParams, validateQuery } = require('../middleware/safetyValidator');
const {
  admissionIdParamSchema,
  createAdmissionSchema,
  assignBedSchema,
  cancelAdmissionSchema,
  listAdmissionsQuerySchema,
} = require('../validators/admissionValidators');
const { emptyOrReasonSchema } = require('../validators/bedValidators');

// POST /api/admissions - Request patient admission
router.post(
  '/',
  validateBody(createAdmissionSchema),
  admissionController.createAdmission
);

// GET /api/admissions - List admissions
router.get(
  '/',
  validateQuery(listAdmissionsQuerySchema),
  admissionController.listAdmissions
);

// GET /api/admissions/:admissionId - Inspect admission details
router.get(
  '/:admissionId',
  validateParams(admissionIdParamSchema),
  admissionController.getAdmissionById
);

// POST /api/admissions/:admissionId/pending-review - Operational workflow review
router.post(
  '/:admissionId/pending-review',
  validateParams(admissionIdParamSchema),
  validateBody(emptyOrReasonSchema),
  admissionController.markPendingReview
);

// POST /api/admissions/:admissionId/assign-bed - Allocate an available bed
router.post(
  '/:admissionId/assign-bed',
  validateParams(admissionIdParamSchema),
  validateBody(assignBedSchema),
  admissionController.assignBed
);

// POST /api/admissions/:admissionId/confirm - Confirm intake logistics
router.post(
  '/:admissionId/confirm',
  validateParams(admissionIdParamSchema),
  validateBody(emptyOrReasonSchema),
  admissionController.confirmAdmission
);

// POST /api/admissions/:admissionId/admit - Officially admit patient to ward
router.post(
  '/:admissionId/admit',
  validateParams(admissionIdParamSchema),
  validateBody(emptyOrReasonSchema),
  admissionController.admitPatient
);

// POST /api/admissions/:admissionId/discharge - Discharge patient and mark bed for cleaning
router.post(
  '/:admissionId/discharge',
  validateParams(admissionIdParamSchema),
  validateBody(emptyOrReasonSchema),
  admissionController.dischargePatient
);

// POST /api/admissions/:admissionId/cancel - Cancel admission and release allocated bed
router.post(
  '/:admissionId/cancel',
  validateParams(admissionIdParamSchema),
  validateBody(cancelAdmissionSchema),
  admissionController.cancelAdmission
);

module.exports = router;
