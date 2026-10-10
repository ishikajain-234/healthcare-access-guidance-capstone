const hospitalService = require('../services/hospitalService');

class HospitalController {
  async listHospitals(req, res, next) {
    try {
      const data = await hospitalService.listHospitals();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listDepartments(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const data = await hospitalService.listDepartmentsByHospital(hospitalId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listCounters(req, res, next) {
    try {
      const { hospitalId, departmentId } = req.params;
      const data = await hospitalService.listCountersByDepartment(hospitalId, departmentId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HospitalController();
