const express = require('express');
const router = express.Router();
const referencePackageController = require('../controllers/referencePackageController');

// GET /api/reference-packages
router.get('/', referencePackageController.getAllPackages);

module.exports = router;
