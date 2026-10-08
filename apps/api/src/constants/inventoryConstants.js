/**
 * Frozen Inventory Constants & Stock Status Rules (Architecture Freeze v2.1)
 */

const TRANSACTION_TYPES = Object.freeze({
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
});

const STOCK_STATUS = Object.freeze({
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

const ITEM_TYPES = Object.freeze({
  MEDICINE: 'MEDICINE',
  CONSUMABLE: 'CONSUMABLE',
});

const UNITS_OF_MEASURE = Object.freeze({
  TABLET: 'TABLET',
  VIAL: 'VIAL',
  PIECE: 'PIECE',
  BOX: 'BOX',
  ROLL: 'ROLL',
  SACHET: 'SACHET',
  PAIR: 'PAIR',
});

/**
 * Pure function computing stock status
 * CURRENT_STOCK > REORDER_THRESHOLD → IN_STOCK
 * CURRENT_STOCK > 0 AND CURRENT_STOCK <= REORDER_THRESHOLD → LOW_STOCK
 * CURRENT_STOCK = 0 → OUT_OF_STOCK
 */
function calculateStockStatus(currentStock, reorderThreshold) {
  const stock = Number(currentStock);
  const threshold = Number(reorderThreshold);

  if (stock === 0) {
    return STOCK_STATUS.OUT_OF_STOCK;
  }
  if (stock <= threshold) {
    return STOCK_STATUS.LOW_STOCK;
  }
  return STOCK_STATUS.IN_STOCK;
}

module.exports = {
  TRANSACTION_TYPES,
  STOCK_STATUS,
  ITEM_TYPES,
  UNITS_OF_MEASURE,
  calculateStockStatus,
};
