const inventoryService = require('../services/inventoryService');
const { checkProhibitedInventoryKeys } = require('../validators/inventoryValidators');
const { TRANSACTION_TYPES } = require('../constants/inventoryConstants');

class InventoryController {
  async listItems(req, res, next) {
    try {
      const data = await inventoryService.listItems(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getItemById(req, res, next) {
    try {
      const { itemId } = req.params;
      const data = await inventoryService.getItemById(itemId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getAvailability(req, res, next) {
    try {
      const data = await inventoryService.getAvailability(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async receiveStock(req, res, next) {
    try {
      checkProhibitedInventoryKeys(req.body);
      const { itemId } = req.params;
      const data = await inventoryService.recordStockTransaction(itemId, {
        ...req.body,
        transaction_type: TRANSACTION_TYPES.RECEIPT,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async issueStock(req, res, next) {
    try {
      checkProhibitedInventoryKeys(req.body);
      const { itemId } = req.params;
      const data = await inventoryService.recordStockTransaction(itemId, {
        ...req.body,
        transaction_type: TRANSACTION_TYPES.ISSUE,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async adjustStock(req, res, next) {
    try {
      checkProhibitedInventoryKeys(req.body);
      const { itemId } = req.params;
      const data = await inventoryService.recordStockTransaction(itemId, {
        ...req.body,
        transaction_type: TRANSACTION_TYPES.ADJUSTMENT,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async transferInStock(req, res, next) {
    try {
      checkProhibitedInventoryKeys(req.body);
      const { itemId } = req.params;
      const data = await inventoryService.recordStockTransaction(itemId, {
        ...req.body,
        transaction_type: TRANSACTION_TYPES.TRANSFER_IN,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async transferOutStock(req, res, next) {
    try {
      checkProhibitedInventoryKeys(req.body);
      const { itemId } = req.params;
      const data = await inventoryService.recordStockTransaction(itemId, {
        ...req.body,
        transaction_type: TRANSACTION_TYPES.TRANSFER_OUT,
      });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async listTransactions(req, res, next) {
    try {
      const data = await inventoryService.listTransactions(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getItemTransactions(req, res, next) {
    try {
      const { itemId } = req.params;
      const data = await inventoryService.getItemTransactions(itemId, req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventoryController();
