const admissionService = require('../services/admissionService');
const { checkProhibitedAdmissionKeys } = require('../validators/admissionValidators');

class AdmissionController {
  async createAdmission(req, res, next) {
    try {
      checkProhibitedAdmissionKeys(req.body);
      const data = await admissionService.createAdmission(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listAdmissions(req, res, next) {
    try {
      const data = await admissionService.listAdmissions(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getAdmissionById(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.getAdmissionById(admissionId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async markPendingReview(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.markPendingReview(admissionId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async assignBed(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.assignBed(admissionId, req.body);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async confirmAdmission(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.confirmAdmission(admissionId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async admitPatient(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.admitPatient(admissionId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async dischargePatient(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.dischargePatient(admissionId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async cancelAdmission(req, res, next) {
    try {
      const { admissionId } = req.params;
      const data = await admissionService.cancelAdmission(admissionId, req.body);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdmissionController();
