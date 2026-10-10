const { z } = require('zod');
const { OPD_TOKEN_STATES } = require('../constants/opdStateMachine');

const PROHIBITED_KEYS = [
  'name', 'phone', 'phone_number', 'aadhaar', 'aadhaar_number', 'abha', 'abha_id',
  'symptom', 'symptoms', 'diagnosis', 'triage', 'triage_score', 'prescription',
  'clinical_notes', 'patient_id', 'citizen_name'
];

/**
 * Middleware or pre-check ensuring zero PII or clinical fields are accepted.
 */
function checkProhibitedKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  const keys = Object.keys(obj).map(k => k.toLowerCase());
  for (const prohibited of PROHIBITED_KEYS) {
    if (keys.includes(prohibited)) {
      const error = new Error(`Prohibited field '${prohibited}' is strictly rejected. This prototype does not collect personal, identity, or clinical information.`);
      error.statusCode = 400;
      error.errorCode = 'UNSUPPORTED_INPUT';
      throw error;
    }
  }
}

const hospitalIdParamSchema = z
  .object({
    hospitalId: z.string().trim().min(1, 'hospitalId parameter cannot be empty').max(64),
  })
  .strict();

const hospitalDeptParamSchema = z
  .object({
    hospitalId: z.string().trim().min(1, 'hospitalId parameter cannot be empty').max(64),
    departmentId: z.string().trim().min(1, 'departmentId parameter cannot be empty').max(64),
  })
  .strict();

const tokenIdParamSchema = z
  .object({
    tokenId: z.string().uuid({ message: 'tokenId parameter must be a valid UUIDv4' }),
  })
  .strict();

const createTokenSchema = z
  .object({
    hospital_id: z.string().trim().min(1, 'hospital_id is required').max(64),
    department_id: z.string().trim().min(1, 'department_id is required').max(64),
    linked_session_id: z.string().uuid({ message: 'linked_session_id must be a valid UUIDv4' }).optional().nullable(),
    priority_level: z.number().int().min(0).max(10).optional(),
  })
  .strict();

const callTokenSchema = z
  .object({
    counter_id: z.string().trim().min(1, 'counter_id is required to call a token').max(64),
  })
  .strict();

const startTokenSchema = z
  .object({
    audit_reason: z.string().trim().max(255).optional(),
  })
  .strict();

const completeTokenSchema = z
  .object({
    audit_reason: z.string().trim().max(255).optional(),
  })
  .strict();

const cancelTokenSchema = z
  .object({
    reason: z.string().trim().max(255).optional(),
  })
  .strict();

const listTokensQuerySchema = z
  .object({
    hospital_id: z.string().trim().max(64).optional(),
    department_id: z.string().trim().max(64).optional(),
    status: z.enum([
      OPD_TOKEN_STATES.WAITING,
      OPD_TOKEN_STATES.CALLED,
      OPD_TOKEN_STATES.IN_SERVICE,
      OPD_TOKEN_STATES.COMPLETED,
      OPD_TOKEN_STATES.CANCELLED,
    ]).optional(),
    counter_id: z.string().trim().max(64).optional(),
  })
  .strict();

const opdAnalyticsQuerySchema = z
  .object({
    hospital_id: z.string().trim().min(1, 'hospital_id is required').max(64),
    department_id: z.string().trim().min(1, 'department_id is required').max(64),
    lambda: z.preprocess((val) => {
      if (val === undefined || val === '') return 30;
      const parsed = Number(val);
      return isNaN(parsed) ? val : parsed;
    }, z.number({ invalid_type_error: 'lambda must be a valid number' })
       .positive({ message: 'lambda must be greater than zero' })),
    mu: z.preprocess((val) => {
      if (val === undefined || val === '') return 8;
      const parsed = Number(val);
      return isNaN(parsed) ? val : parsed;
    }, z.number({ invalid_type_error: 'mu must be a valid number' })
       .positive({ message: 'mu must be greater than zero' })),
  })
  .strict();

module.exports = {
  checkProhibitedKeys,
  hospitalIdParamSchema,
  hospitalDeptParamSchema,
  tokenIdParamSchema,
  createTokenSchema,
  callTokenSchema,
  startTokenSchema,
  completeTokenSchema,
  cancelTokenSchema,
  listTokensQuerySchema,
  opdAnalyticsQuerySchema,
};
