const { z } = require('zod');
const { ADMISSION_STATES } = require('../constants/admissionStateMachine');

const PROHIBITED_KEYS = [
  'name', 'phone', 'phone_number', 'aadhaar', 'aadhaar_number', 'abha', 'abha_id',
  'symptom', 'symptoms', 'diagnosis', 'triage', 'triage_score', 'prescription',
  'clinical_notes', 'patient_id', 'citizen_name', 'medical_condition'
];

function checkProhibitedAdmissionKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  const keys = Object.keys(obj).map(k => k.toLowerCase());
  for (const prohibited of PROHIBITED_KEYS) {
    if (keys.includes(prohibited)) {
      const error = new Error(`Prohibited field '${prohibited}' is strictly rejected. This prototype does not collect personal, identity, or clinical triage information.`);
      error.statusCode = 400;
      error.errorCode = 'UNSUPPORTED_INPUT';
      throw error;
    }
  }
}

const admissionIdParamSchema = z
  .object({
    admissionId: z.string().uuid({ message: 'admissionId must be a valid UUIDv4' }),
  })
  .strict();

const createAdmissionSchema = z
  .object({
    hospital_id: z.string().trim().min(1, 'hospital_id is required').max(64),
    ward_id: z.string().trim().min(1, 'ward_id is required').max(64),
    linked_token_id: z.string().uuid({ message: 'linked_token_id must be a valid UUIDv4' }).optional().nullable(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

const assignBedSchema = z
  .object({
    bed_id: z.string().trim().min(1, 'bed_id is required').max(64),
  })
  .strict();

const cancelAdmissionSchema = z
  .object({
    reason: z.string().trim().max(255).optional(),
  })
  .strict();

const listAdmissionsQuerySchema = z
  .object({
    hospital_id: z.string().trim().max(64).optional(),
    ward_id: z.string().trim().max(64).optional(),
    status: z.enum([
      ADMISSION_STATES.ADMISSION_REQUESTED,
      ADMISSION_STATES.PENDING_REVIEW,
      ADMISSION_STATES.BED_ASSIGNED,
      ADMISSION_STATES.ADMISSION_CONFIRMED,
      ADMISSION_STATES.ADMITTED,
      ADMISSION_STATES.DISCHARGED,
      ADMISSION_STATES.CANCELLED,
    ]).optional(),
  })
  .strict();

module.exports = {
  checkProhibitedAdmissionKeys,
  admissionIdParamSchema,
  createAdmissionSchema,
  assignBedSchema,
  cancelAdmissionSchema,
  listAdmissionsQuerySchema,
};
