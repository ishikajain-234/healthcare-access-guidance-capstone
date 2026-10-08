const opdAnalyticsService = require('../services/opdAnalyticsService');

class OpdAnalyticsController {
  async getAnalytics(req, res, next) {
    try {
      const data = await opdAnalyticsService.getDepartmentAnalytics(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OpdAnalyticsController();
