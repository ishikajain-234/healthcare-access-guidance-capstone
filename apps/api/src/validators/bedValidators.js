const { z } = require('zod');
const { BED_STATES } = require('../constants/bedStateMachine');

const bedIdParamSchema = z
  .object({
    bedId: z.string().trim().min(1, 'bedId parameter cannot be empty').max(64),
  })
  .strict();

const listBedsQuerySchema = z
  .object({
    ward_id: z.string().trim().max(64).optional(),
    current_state: z.enum([
      BED_STATES.AVAILABLE,
      BED_STATES.RESERVED,
      BED_STATES.OCCUPIED,
      BED_STATES.CLEANING,
      BED_STATES.OUT_OF_SERVICE,
    ]).optional(),
  })
  .strict();

const emptyOrReasonSchema = z
  .object({
    audit_reason: z.string().trim().max(255).optional(),
  })
  .strict();

module.exports = {
  bedIdParamSchema,
  listBedsQuerySchema,
  emptyOrReasonSchema,
};
