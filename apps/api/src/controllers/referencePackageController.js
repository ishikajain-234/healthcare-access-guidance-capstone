const referencePackageService = require('../services/referencePackageService');

class ReferencePackageController {
  async getAllPackages(req, res, next) {
    try {
      const result = await referencePackageService.getAllPackages();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReferencePackageController();
