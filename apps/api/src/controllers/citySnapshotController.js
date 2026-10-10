const citySnapshotService = require('../services/citySnapshotService');

class CitySnapshotController {
  async getCityOverview(req, res, next) {
    try {
      const data = await citySnapshotService.getCityOverview();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listSnapshots(req, res, next) {
    try {
      const data = await citySnapshotService.listSnapshots(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CitySnapshotController();
