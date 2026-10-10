const { z } = require('zod');

const PROHIBITED_KEYS = [
  'name', 'phone', 'phone_number', 'aadhaar', 'aadhaar_number', 'abha', 'abha_id',
  'symptom', 'symptoms', 'diagnosis', 'triage', 'prescription', 'patient_id'
];

function checkProhibitedKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  const keys = Object.keys(obj).map(k => k.toLowerCase());
  for (const prohibited of PROHIBITED_KEYS) {
    if (keys.includes(prohibited)) {
      const error = new Error(`Prohibited field '${prohibited}' is strictly rejected.`);
      error.statusCode = 400;
      error.errorCode = 'UNSUPPORTED_INPUT';
      throw error;
    }
  }
}

const citySnapshotQuerySchema = z
  .object({
    period: z.enum(['15_MIN', 'HOURLY', 'DAILY', 'CUSTOM']).optional(),
    level: z.enum(['CITY', 'HOSPITAL', 'DEPARTMENT']).optional(),
    hospital_id: z.string().trim().max(64).optional(),
    department_id: z.string().trim().max(64).optional(),
    limit: z.preprocess((val) => {
      if (val === undefined || val === '') return 50;
      const num = Number(val);
      return isNaN(num) ? val : num;
    }, z.number().int().min(1).max(100)).optional(),
  })
  .strict();

module.exports = {
  checkProhibitedKeys,
  citySnapshotQuerySchema,
};
