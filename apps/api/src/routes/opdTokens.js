const express = require('express');
const router = express.Router();
const opdTokenController = require('../controllers/opdTokenController');
const { validateBody, validateParams } = require('../middleware/safetyValidator');
const {
  tokenIdParamSchema,
  createTokenSchema,
  callTokenSchema,
  startTokenSchema,
  completeTokenSchema,
  cancelTokenSchema,
} = require('../validators/opdValidators');

// POST /api/opd/tokens - Create anonymous OPD token
router.post(
  '/tokens',
  validateBody(createTokenSchema),
  opdTokenController.createToken
);

// GET /api/opd/tokens - List OPD tokens (queue inspection)
router.get(
  '/tokens',
  opdTokenController.listTokens
);

// POST /api/opd/tokens/:tokenId/call - Call token to counter (WAITING -> CALLED)
router.post(
  '/tokens/:tokenId/call',
  validateParams(tokenIdParamSchema),
  validateBody(callTokenSchema),
  opdTokenController.callToken
);

// POST /api/opd/tokens/:tokenId/start - Start service (CALLED -> IN_SERVICE)
router.post(
  '/tokens/:tokenId/start',
  validateParams(tokenIdParamSchema),
  validateBody(startTokenSchema),
  opdTokenController.startService
);

// POST /api/opd/tokens/:tokenId/complete - Complete service (IN_SERVICE -> COMPLETED)
router.post(
  '/tokens/:tokenId/complete',
  validateParams(tokenIdParamSchema),
  validateBody(completeTokenSchema),
  opdTokenController.completeService
);

// POST /api/opd/tokens/:tokenId/cancel - Cancel token (WAITING/CALLED -> CANCELLED)
router.post(
  '/tokens/:tokenId/cancel',
  validateParams(tokenIdParamSchema),
  validateBody(cancelTokenSchema),
  opdTokenController.cancelToken
);

module.exports = router;
