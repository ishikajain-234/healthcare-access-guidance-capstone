const { z } = require('zod');
const { TRANSACTION_TYPES, STOCK_STATUS, ITEM_TYPES } = require('../constants/inventoryConstants');

const PROHIBITED_KEYS = [
  'name', 'patient_name', 'phone', 'phone_number', 'aadhaar', 'aadhaar_number',
  'abha', 'abha_id', 'symptom', 'symptoms', 'diagnosis', 'triage', 'triage_score',
  'prescription', 'clinical_notes', 'patient_id', 'citizen_name', 'medical_condition',
];

function checkProhibitedInventoryKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  for (const prohibited of PROHIBITED_KEYS) {
    if (keys.includes(prohibited)) {
      const error = new Error(
        `Prohibited field '${prohibited}' is strictly rejected. Inventory management does not collect personal, patient identity, or clinical information.`
      );
      error.statusCode = 400;
      error.errorCode = 'UNSUPPORTED_INPUT';
      throw error;
    }
  }
}

const itemIdParamSchema = z
  .object({
    itemId: z.string().trim().min(1, 'itemId parameter cannot be empty').max(64),
  })
  .strict();

const listInventoryItemsQuerySchema = z
  .object({
    hospital_id: z.string().trim().max(64).optional(),
    item_type: z.enum([ITEM_TYPES.MEDICINE, ITEM_TYPES.CONSUMABLE]).optional(),
    stock_status: z.enum([STOCK_STATUS.IN_STOCK, STOCK_STATUS.LOW_STOCK, STOCK_STATUS.OUT_OF_STOCK]).optional(),
    is_active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
  })
  .strict();

const inventoryAvailabilityQuerySchema = z
  .object({
    hospital_id: z.string().trim().max(64).optional(),
  })
  .strict();

const receiveStockSchema = z
  .object({
    quantity: z.number().int().positive({ message: 'quantity must be a positive integer greater than zero' }),
    batch_number: z.string().trim().max(64).optional(),
    audit_reason: z.string().trim().min(3, 'audit_reason is required and must be at least 3 characters').max(500),
    is_simulated: z.boolean().optional(),
  })
  .strict();

const issueStockSchema = z
  .object({
    quantity: z.number().int().positive({ message: 'quantity must be a positive integer greater than zero' }),
    batch_number: z.string().trim().max(64).optional(),
    linked_token_id: z.string().uuid({ message: 'linked_token_id must be a valid UUIDv4' }).optional().nullable(),
    audit_reason: z.string().trim().min(3, 'audit_reason is required and must be at least 3 characters').max(500),
    is_simulated: z.boolean().optional(),
  })
  .strict();

const adjustStockSchema = z
  .object({
    adjustment_quantity: z.number().int().refine((v) => v !== 0, {
      message: 'adjustment_quantity cannot be zero',
    }).optional(),
    quantity: z.number().int().refine((v) => v !== 0, {
      message: 'quantity cannot be zero',
    }).optional(),
    batch_number: z.string().trim().max(64).optional(),
    audit_reason: z.string().trim().min(3, 'audit_reason is required and must be at least 3 characters').max(500),
    is_simulated: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.adjustment_quantity !== undefined || data.quantity !== undefined, {
    message: 'Either adjustment_quantity or quantity must be provided as a non-zero signed integer',
  });

const transferInStockSchema = z
  .object({
    quantity: z.number().int().positive({ message: 'quantity must be a positive integer greater than zero' }),
    batch_number: z.string().trim().max(64).optional(),
    audit_reason: z.string().trim().min(3, 'audit_reason is required and must be at least 3 characters').max(500),
    is_simulated: z.boolean().optional(),
  })
  .strict();

const transferOutStockSchema = z
  .object({
    quantity: z.number().int().positive({ message: 'quantity must be a positive integer greater than zero' }),
    batch_number: z.string().trim().max(64).optional(),
    audit_reason: z.string().trim().min(3, 'audit_reason is required and must be at least 3 characters').max(500),
    is_simulated: z.boolean().optional(),
  })
  .strict();

const listTransactionsQuerySchema = z
  .object({
    hospital_id: z.string().trim().max(64).optional(),
    item_id: z.string().trim().max(64).optional(),
    transaction_type: z.enum([
      TRANSACTION_TYPES.RECEIPT,
      TRANSACTION_TYPES.ISSUE,
      TRANSACTION_TYPES.ADJUSTMENT,
      TRANSACTION_TYPES.TRANSFER_IN,
      TRANSACTION_TYPES.TRANSFER_OUT,
    ]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
  })
  .strict();

const itemTransactionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
  })
  .strict();

module.exports = {
  checkProhibitedInventoryKeys,
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
};
