const adminAnalyticsService = require('../services/adminAnalyticsService');

class AdminAnalyticsController {
  async getSummary(req, res, next) {
    try {
      const data = await adminAnalyticsService.getSummaryMetrics();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getDataQuality(req, res, next) {
    try {
      const data = await adminAnalyticsService.getDataQualitySummary();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminAnalyticsController();
