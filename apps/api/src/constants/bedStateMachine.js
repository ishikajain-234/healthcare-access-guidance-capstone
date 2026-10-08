/**
 * Bed State Machine Constants & Transition Validation (Architecture Freeze v2.1)
 *
 * Allowed Transitions (Enforced by Database Trigger):
 * AVAILABLE -> RESERVED
 * RESERVED -> OCCUPIED
 * OCCUPIED -> CLEANING
 * CLEANING -> AVAILABLE
 * AVAILABLE -> OUT_OF_SERVICE
 * OUT_OF_SERVICE -> AVAILABLE
 * RESERVED -> AVAILABLE
 */

const BED_STATES = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
};

const BED_ALLOWED_TRANSITIONS = {
  [BED_STATES.AVAILABLE]: [
    BED_STATES.RESERVED,
    BED_STATES.OUT_OF_SERVICE,
  ],
  [BED_STATES.RESERVED]: [
    BED_STATES.OCCUPIED,
    BED_STATES.AVAILABLE,
  ],
  [BED_STATES.OCCUPIED]: [
    BED_STATES.CLEANING,
  ],
  [BED_STATES.CLEANING]: [
    BED_STATES.AVAILABLE,
  ],
  [BED_STATES.OUT_OF_SERVICE]: [
    BED_STATES.AVAILABLE,
  ],
};

function isValidBedTransition(fromState, toState) {
  if (!BED_ALLOWED_TRANSITIONS[fromState]) return false;
  return BED_ALLOWED_TRANSITIONS[fromState].includes(toState);
}

module.exports = {
  BED_STATES,
  BED_ALLOWED_TRANSITIONS,
  isValidBedTransition,
};
