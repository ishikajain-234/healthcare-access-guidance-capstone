const express = require('express');
const router = express.Router();
const guidanceSessionController = require('../controllers/guidanceSessionController');
const { validateBody, validateParams } = require('../middleware/safetyValidator');
const { createRateLimiter } = require('../middleware/rateLimiter');
const {
  createSessionSchema,
  searchCategorySchema,
  officialRouteSchema,
  supportRouteSchema,
  completeSessionSchema,
  sessionIdParamSchema,
} = require('../validators/sessionValidators');

const sessionRateLimiter = createRateLimiter({ max: 100, windowMs: 15 * 60 * 1000 });

// POST /api/guidance/sessions
router.post(
  '/sessions',
  sessionRateLimiter,
  validateBody(createSessionSchema),
  guidanceSessionController.createSession
);

// POST /api/guidance/search
router.post(
  '/search',
  validateBody(searchCategorySchema),
  guidanceSessionController.search
);

// POST /api/guidance/official-route
router.post(
  '/official-route',
  validateBody(officialRouteSchema),
  guidanceSessionController.showOfficialRoute
);

// POST /api/guidance/support-route
router.post(
  '/support-route',
  validateBody(supportRouteSchema),
  guidanceSessionController.showSupportRoute
);

// POST /api/guidance/complete
router.post(
  '/complete',
  validateBody(completeSessionSchema),
  guidanceSessionController.completeSession
);

// GET /api/guidance/sessions/:id
router.get(
  '/sessions/:id',
  validateParams(sessionIdParamSchema),
  guidanceSessionController.getSessionById
);

module.exports = router;
