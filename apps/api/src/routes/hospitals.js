const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
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

module.exports = router;
