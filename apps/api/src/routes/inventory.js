const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../middleware/safetyValidator');
const {
  itemIdParamSchema,
  listInventoryItemsQuerySchema,
  inventoryAvailabilityQuerySchema,
  receiveStockSchema,
  issueStockSchema,
  adjustStockSchema,
  transferInStockSchema,
  transferOutStockSchema,
  listTransactionsQuerySchema,
  itemTransactionsQuerySchema,
} = require('../validators/inventoryValidators');

// GET /api/inventory/availability
router.get(
  '/availability',
  validateQuery(inventoryAvailabilityQuerySchema),
  inventoryController.getAvailability
);

// GET /api/inventory/items
router.get(
  '/items',
  validateQuery(listInventoryItemsQuerySchema),
  inventoryController.listItems
);

// GET /api/inventory/transactions
router.get(
  '/transactions',
  validateQuery(listTransactionsQuerySchema),
  inventoryController.listTransactions
);

// GET /api/inventory/items/:itemId
router.get(
  '/items/:itemId',
  validateParams(itemIdParamSchema),
  inventoryController.getItemById
);

// GET /api/inventory/items/:itemId/transactions
router.get(
  '/items/:itemId/transactions',
  validateParams(itemIdParamSchema),
  validateQuery(itemTransactionsQuerySchema),
  inventoryController.getItemTransactions
);

// POST /api/inventory/items/:itemId/receive
router.post(
  '/items/:itemId/receive',
  validateParams(itemIdParamSchema),
  validateBody(receiveStockSchema),
  inventoryController.receiveStock
);

// POST /api/inventory/items/:itemId/issue
router.post(
  '/items/:itemId/issue',
  validateParams(itemIdParamSchema),
  validateBody(issueStockSchema),
  inventoryController.issueStock
);

// POST /api/inventory/items/:itemId/adjust
router.post(
  '/items/:itemId/adjust',
  validateParams(itemIdParamSchema),
  validateBody(adjustStockSchema),
  inventoryController.adjustStock
);

// POST /api/inventory/items/:itemId/transfer-in
router.post(
  '/items/:itemId/transfer-in',
  validateParams(itemIdParamSchema),
  validateBody(transferInStockSchema),
  inventoryController.transferInStock
);

// POST /api/inventory/items/:itemId/transfer-out
router.post(
  '/items/:itemId/transfer-out',
  validateParams(itemIdParamSchema),
  validateBody(transferOutStockSchema),
  inventoryController.transferOutStock
);

module.exports = router;
