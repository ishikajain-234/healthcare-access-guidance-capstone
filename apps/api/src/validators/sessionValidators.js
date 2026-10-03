const { z } = require('zod');
const { VALID_CATEGORY_IDS } = require('../constants/categories');

const createSessionSchema = z
  .object({
    client_timestamp: z.string().datetime().optional(),
  })
  .strict();

const searchCategorySchema = z
  .object({
    session_id: z.string().uuid({ message: 'session_id must be a valid UUIDv4' }),
    category_id: z.enum(VALID_CATEGORY_IDS, {
      errorMap: () => ({ message: `category_id must be one of: ${VALID_CATEGORY_IDS.join(', ')}` }),
    }),
  })
  .strict();

const officialRouteSchema = z
  .object({
    session_id: z.string().uuid({ message: 'session_id must be a valid UUIDv4' }),
  })
  .strict();

const supportRouteSchema = z
  .object({
    session_id: z.string().uuid({ message: 'session_id must be a valid UUIDv4' }),
  })
  .strict();

const completeSessionSchema = z
  .object({
    session_id: z.string().uuid({ message: 'session_id must be a valid UUIDv4' }),
  })
  .strict();

const sessionIdParamSchema = z
  .object({
    id: z.string().uuid({ message: 'Parameter :id must be a valid UUIDv4' }),
  })
  .strict();

module.exports = {
  createSessionSchema,
  searchCategorySchema,
  officialRouteSchema,
  supportRouteSchema,
  completeSessionSchema,
  sessionIdParamSchema,
};
