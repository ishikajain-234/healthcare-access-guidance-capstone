const db = require('../db');
const {
  TRANSACTION_TYPES,
  STOCK_STATUS,
  calculateStockStatus,
} = require('../constants/inventoryConstants');

class InventoryService {
  /**
   * List inventory items with stock status computation and optional filters
   */
  async listItems({
    hospital_id,
    item_type,
    stock_status,
    is_active,
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];

    if (hospital_id) {
      values.push(hospital_id);
      conditions.push(`hospital_id = $${values.length}`);
    }

    if (item_type) {
      values.push(item_type);
      conditions.push(`item_type = $${values.length}`);
    }

    if (is_active !== undefined) {
      values.push(is_active);
      conditions.push(`is_active = $${values.length}`);
    }

    if (stock_status) {
      if (stock_status === STOCK_STATUS.OUT_OF_STOCK) {
        conditions.push(`current_stock = 0`);
      } else if (stock_status === STOCK_STATUS.LOW_STOCK) {
        conditions.push(`current_stock > 0 AND current_stock <= reorder_threshold`);
      } else if (stock_status === STOCK_STATUS.IN_STOCK) {
        conditions.push(`current_stock > reorder_threshold`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) AS total FROM inventory_item ${whereClause};`,
      values
    );
    const totalItems = parseInt(countRes.rows[0].total, 10);

    const dataValues = [...values, limit, offset];
    const dataRes = await db.query(
      `SELECT
         item_id,
         hospital_id,
         item_code,
         item_name,
         item_type,
         unit_of_measure,
         current_stock,
         reorder_threshold,
         reorder_quantity,
         is_active,
         is_simulated,
         created_at,
         updated_at
       FROM inventory_item
       ${whereClause}
       ORDER BY hospital_id ASC, item_code ASC
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};`,
      dataValues
    );

    const items = dataRes.rows.map((row) => ({
      ...row,
      stock_status: calculateStockStatus(row.current_stock, row.reorder_threshold),
    }));

    return {
      total_items: totalItems,
      items,
    };
  }

  /**
   * Get an individual inventory item by itemId
   */
  async getItemById(itemId) {
    const res = await db.query(
      `SELECT
         item_id,
         hospital_id,
         item_code,
         item_name,
         item_type,
         unit_of_measure,
         current_stock,
         reorder_threshold,
         reorder_quantity,
         is_active,
         is_simulated,
         created_at,
         updated_at
       FROM inventory_item
       WHERE item_id = $1;`,
      [itemId]
    );

    if (res.rows.length === 0) {
      const error = new Error(`Inventory item '${itemId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'ITEM_NOT_FOUND';
      throw error;
    }

    const item = res.rows[0];
    return {
      ...item,
      stock_status: calculateStockStatus(item.current_stock, item.reorder_threshold),
    };
  }

  /**
   * Get operational stock availability metrics
   */
  async getAvailability({ hospital_id } = {}) {
    if (hospital_id) {
      const hospCheck = await db.query(
        `SELECT hospital_id FROM hospital WHERE hospital_id = $1;`,
        [hospital_id]
      );
      if (hospCheck.rows.length === 0) {
        const error = new Error(`Hospital '${hospital_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'HOSPITAL_NOT_FOUND';
        throw error;
      }
    }

    const conditions = ['is_active = TRUE'];
    const values = [];

    if (hospital_id) {
      values.push(hospital_id);
      conditions.push(`hospital_id = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const res = await db.query(
      `SELECT
         item_id,
         hospital_id,
         item_code,
         item_name,
         item_type,
         unit_of_measure,
         current_stock,
         reorder_threshold,
         reorder_quantity,
         is_active,
         is_simulated,
         updated_at
       FROM inventory_item
       ${whereClause}
       ORDER BY hospital_id ASC, item_code ASC;`,
      values
    );

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const items = res.rows.map((row) => {
      const status = calculateStockStatus(row.current_stock, row.reorder_threshold);
      if (status === STOCK_STATUS.IN_STOCK) inStockCount++;
      else if (status === STOCK_STATUS.LOW_STOCK) lowStockCount++;
      else if (status === STOCK_STATUS.OUT_OF_STOCK) outOfStockCount++;

      return {
        item_id: row.item_id,
        hospital_id: row.hospital_id,
        item_code: row.item_code,
        item_name: row.item_name,
        current_stock: row.current_stock,
        reorder_threshold: row.reorder_threshold,
        unit_of_measure: row.unit_of_measure,
        stock_status: status,
      };
    });

    return {
      hospital_id: hospital_id || null,
      total_items: items.length,
      in_stock_items: inStockCount,
      low_stock_items: lowStockCount,
      out_of_stock_items: outOfStockCount,
      items,
    };
  }

  /**
   * Execute an atomic, concurrency-locked stock mutation with append-only ledger insert
   */
  async recordStockTransaction(itemId, {
    transaction_type,
    quantity,
    adjustment_quantity,
    batch_number = 'DEFAULT_BATCH',
    linked_token_id = null,
    audit_reason,
    is_simulated = true,
  }) {
    if (!audit_reason || typeof audit_reason !== 'string' || audit_reason.trim().length < 3) {
      const error = new Error('audit_reason is required and must be at least 3 characters.');
      error.statusCode = 400;
      error.errorCode = 'AUDIT_REASON_REQUIRED';
      throw error;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock item row
      const itemRes = await client.query(
        `SELECT * FROM inventory_item WHERE item_id = $1 FOR UPDATE;`,
        [itemId]
      );

      if (itemRes.rows.length === 0) {
        const error = new Error(`Inventory item '${itemId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ITEM_NOT_FOUND';
        throw error;
      }

      const item = itemRes.rows[0];

      // 2. Validate linked OPD token if provided
      if (linked_token_id) {
        const tokenRes = await client.query(
          `SELECT token_id, hospital_id FROM opd_token WHERE token_id = $1;`,
          [linked_token_id]
        );
        if (tokenRes.rows.length === 0) {
          const error = new Error(`OPD Token '${linked_token_id}' not found.`);
          error.statusCode = 404;
          error.errorCode = 'TOKEN_NOT_FOUND';
          throw error;
        }

        const token = tokenRes.rows[0];
        if (token.hospital_id !== item.hospital_id) {
          const error = new Error(
            `Cross-hospital operation prohibited: Linked OPD token belongs to hospital '${token.hospital_id}', but inventory item belongs to '${item.hospital_id}'.`
          );
          error.statusCode = 400;
          error.errorCode = 'CROSS_HOSPITAL_OPERATION_PROHIBITED';
          throw error;
        }
      }

      // 3. Compute stock delta and ledger quantity
      let stockDelta = 0;
      let dbQuantity = 0;

      switch (transaction_type) {
        case TRANSACTION_TYPES.RECEIPT:
          stockDelta = quantity;
          dbQuantity = quantity;
          break;

        case TRANSACTION_TYPES.ISSUE:
          stockDelta = -quantity;
          dbQuantity = quantity;
          break;

        case TRANSACTION_TYPES.TRANSFER_IN:
          stockDelta = quantity;
          dbQuantity = quantity;
          break;

        case TRANSACTION_TYPES.TRANSFER_OUT:
          stockDelta = -quantity;
          dbQuantity = quantity;
          break;

        case TRANSACTION_TYPES.ADJUSTMENT: {
          const adj = adjustment_quantity !== undefined ? adjustment_quantity : quantity;
          if (adj === undefined || adj === null || adj === 0) {
            const error = new Error('Adjustment quantity cannot be zero.');
            error.statusCode = 400;
            error.errorCode = 'INVALID_ADJUSTMENT';
            throw error;
          }
          stockDelta = adj;
          dbQuantity = Math.abs(adj);
          break;
        }

        default: {
          const error = new Error(`Invalid transaction type: '${transaction_type}'.`);
          error.statusCode = 400;
          error.errorCode = 'INVALID_TRANSACTION_TYPE';
          throw error;
        }
      }

      if (!Number.isInteger(dbQuantity) || dbQuantity <= 0) {
        const error = new Error('Transaction quantity must be a strictly positive integer greater than zero.');
        error.statusCode = 400;
        error.errorCode = 'INVALID_QUANTITY';
        throw error;
      }

      // 4. Validate non-negative stock resulting from operation
      const newStock = item.current_stock + stockDelta;
      if (newStock < 0) {
        const error = new Error(
          `Operation rejected: resulting stock (${newStock}) would be negative. Current stock is ${item.current_stock}, requested reduction is ${Math.abs(stockDelta)}.`
        );
        error.statusCode = 409;
        error.errorCode = 'NEGATIVE_STOCK';
        throw error;
      }

      // 5. Insert immutable inventory_transaction row
      const cleanBatch = (batch_number && batch_number.trim()) || 'DEFAULT_BATCH';
      const txRes = await client.query(
        `INSERT INTO inventory_transaction (
           hospital_id,
           item_id,
           transaction_type,
           quantity,
           batch_number,
           linked_token_id,
           audit_reason,
           is_simulated
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *;`,
        [
          item.hospital_id,
          item.item_id,
          transaction_type,
          dbQuantity,
          cleanBatch,
          linked_token_id,
          audit_reason.trim(),
          is_simulated !== false,
        ]
      );

      // 6. Update inventory_item current_stock and updated_at
      const updateRes = await client.query(
        `UPDATE inventory_item
         SET current_stock = $1,
             updated_at = NOW()
         WHERE item_id = $2
         RETURNING *;`,
        [newStock, item.item_id]
      );

      await client.query('COMMIT');

      const txRow = txRes.rows[0];
      const updatedItem = updateRes.rows[0];

      return {
        transaction: txRow,
        item: {
          ...updatedItem,
          previous_stock: item.current_stock,
          stock_status: calculateStockStatus(newStock, updatedItem.reorder_threshold),
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List inventory transactions with optional filters
   */
  async listTransactions({
    hospital_id,
    item_id,
    transaction_type,
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];

    if (hospital_id) {
      values.push(hospital_id);
      conditions.push(`hospital_id = $${values.length}`);
    }

    if (item_id) {
      values.push(item_id);
      conditions.push(`item_id = $${values.length}`);
    }

    if (transaction_type) {
      values.push(transaction_type);
      conditions.push(`transaction_type = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) AS total FROM inventory_transaction ${whereClause};`,
      values
    );
    const totalTransactions = parseInt(countRes.rows[0].total, 10);

    const dataValues = [...values, limit, offset];
    const dataRes = await db.query(
      `SELECT
         transaction_id,
         hospital_id,
         item_id,
         transaction_type,
         quantity,
         batch_number,
         linked_token_id,
         audit_reason,
         is_simulated,
         created_at
       FROM inventory_transaction
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};`,
      dataValues
    );

    return {
      total_transactions: totalTransactions,
      transactions: dataRes.rows,
    };
  }

  /**
   * List transactions for a specific item
   */
  async getItemTransactions(itemId, { limit = 50, offset = 0 } = {}) {
    // Verify item existence
    const itemCheck = await db.query(
      `SELECT item_id FROM inventory_item WHERE item_id = $1;`,
      [itemId]
    );
    if (itemCheck.rows.length === 0) {
      const error = new Error(`Inventory item '${itemId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'ITEM_NOT_FOUND';
      throw error;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) AS total FROM inventory_transaction WHERE item_id = $1;`,
      [itemId]
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const dataRes = await db.query(
      `SELECT
         transaction_id,
         hospital_id,
         item_id,
         transaction_type,
         quantity,
         batch_number,
         linked_token_id,
         audit_reason,
         is_simulated,
         created_at
       FROM inventory_transaction
       WHERE item_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [itemId, limit, offset]
    );

    return {
      item_id: itemId,
      total_transactions: total,
      transactions: dataRes.rows,
    };
  }
}

module.exports = new InventoryService();
