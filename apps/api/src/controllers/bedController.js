const bedService = require('../services/bedService');

class BedController {
  async listWards(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const data = await bedService.listWards(hospitalId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listBeds(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const data = await bedService.listBeds(hospitalId, req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getAvailability(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const data = await bedService.getHospitalBedAvailability(hospitalId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async reserve(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.reserveBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async occupy(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.occupyBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async clean(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.cleanBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async release(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.releaseBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async outOfService(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.outOfServiceBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async restore(req, res, next) {
    try {
      const { bedId } = req.params;
      const data = await bedService.restoreBed(bedId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BedController();
