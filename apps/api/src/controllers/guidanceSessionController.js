const guidanceSessionService = require('../services/guidanceSessionService');

class GuidanceSessionController {
  async createSession(req, res, next) {
    try {
      const result = await guidanceSessionService.createSession();
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async search(req, res, next) {
    try {
      const { session_id, category_id } = req.body;
      const result = await guidanceSessionService.searchCategory(session_id, category_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async showOfficialRoute(req, res, next) {
    try {
      const { session_id } = req.body;
      const result = await guidanceSessionService.showOfficialRoute(session_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async showSupportRoute(req, res, next) {
    try {
      const { session_id } = req.body;
      const result = await guidanceSessionService.showSupportRoute(session_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async completeSession(req, res, next) {
    try {
      const { session_id } = req.body;
      const result = await guidanceSessionService.completeSession(session_id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await guidanceSessionService.getSessionById(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GuidanceSessionController();
