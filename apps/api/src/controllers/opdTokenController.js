const opdTokenService = require('../services/opdTokenService');
const { checkProhibitedKeys } = require('../validators/opdValidators');

class OpdTokenController {
  async createToken(req, res, next) {
    try {
      checkProhibitedKeys(req.body);
      const token = await opdTokenService.createToken(req.body);
      res.status(201).json(token);
    } catch (err) {
      next(err);
    }
  }

  async listTokens(req, res, next) {
    try {
      const data = await opdTokenService.listTokens(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async callToken(req, res, next) {
    try {
      const { tokenId } = req.params;
      const token = await opdTokenService.callToken(tokenId, req.body);
      res.status(200).json(token);
    } catch (err) {
      next(err);
    }
  }

  async startService(req, res, next) {
    try {
      const { tokenId } = req.params;
      const token = await opdTokenService.startService(tokenId);
      res.status(200).json(token);
    } catch (err) {
      next(err);
    }
  }

  async completeService(req, res, next) {
    try {
      const { tokenId } = req.params;
      const token = await opdTokenService.completeService(tokenId);
      res.status(200).json(token);
    } catch (err) {
      next(err);
    }
  }

  async cancelToken(req, res, next) {
    try {
      const { tokenId } = req.params;
      const token = await opdTokenService.cancelToken(tokenId, req.body);
      res.status(200).json(token);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OpdTokenController();
