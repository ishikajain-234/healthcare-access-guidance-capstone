/**
 * OPD Token State Machine Constants and Transition Validation (Architecture Freeze v2.1)
 *
 * Enforced Transitions:
 * WAITING -> CALLED -> IN_SERVICE -> COMPLETED
 * WAITING -> CANCELLED
 * CALLED -> CANCELLED
 */

const OPD_TOKEN_STATES = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_SERVICE: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const OPD_ALLOWED_TRANSITIONS = {
  [OPD_TOKEN_STATES.WAITING]: [
    OPD_TOKEN_STATES.CALLED,
    OPD_TOKEN_STATES.CANCELLED,
  ],
  [OPD_TOKEN_STATES.CALLED]: [
    OPD_TOKEN_STATES.IN_SERVICE,
    OPD_TOKEN_STATES.CANCELLED,
  ],
  [OPD_TOKEN_STATES.IN_SERVICE]: [
    OPD_TOKEN_STATES.COMPLETED,
  ],
  [OPD_TOKEN_STATES.COMPLETED]: [],
  [OPD_TOKEN_STATES.CANCELLED]: [],
};

function isValidOpdTransition(fromState, toState) {
  if (!OPD_ALLOWED_TRANSITIONS[fromState]) return false;
  return OPD_ALLOWED_TRANSITIONS[fromState].includes(toState);
}

module.exports = {
  OPD_TOKEN_STATES,
  OPD_ALLOWED_TRANSITIONS,
  isValidOpdTransition,
};
