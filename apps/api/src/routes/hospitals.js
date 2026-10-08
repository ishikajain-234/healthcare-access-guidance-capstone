const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const bedController = require('../controllers/bedController');
const { validateParams } = require('../middleware/safetyValidator');
const { hospitalIdParamSchema } = require('../validators/opdValidators');

// GET /api/hospitals
router.get('/', hospitalController.listHospitals);

// GET /api/hospitals/:hospitalId/departments
router.get(
  '/:hospitalId/departments',
  validateParams(hospitalIdParamSchema),
  hospitalController.listDepartments
);

// GET /api/hospitals/:hospitalId/wards
router.get(
  '/:hospitalId/wards',
  validateParams(hospitalIdParamSchema),
  bedController.listWards
);

// GET /api/hospitals/:hospitalId/beds/availability
router.get(
  '/:hospitalId/beds/availability',
  validateParams(hospitalIdParamSchema),
  bedController.getAvailability
);

// GET /api/hospitals/:hospitalId/beds
router.get(
  '/:hospitalId/beds',
  validateParams(hospitalIdParamSchema),
  bedController.listBeds
);

module.exports = router;
