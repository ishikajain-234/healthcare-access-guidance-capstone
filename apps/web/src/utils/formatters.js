/**
 * Shared formatting and styling utilities for Hospital Operations Coordination Platform
 */

export function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatDurationMinutes(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
  const num = Number(minutes);
  if (num < 1) {
    return `${Math.round(num * 60)}s`;
  }
  return `${num.toFixed(1)} min`;
}

export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN');
}

/**
 * Bed State Machine Visual Config
 * States: AVAILABLE, RESERVED, OCCUPIED, CLEANING, OUT_OF_SERVICE
 */
export function getBedStatusConfig(status) {
  switch (status) {
    case 'AVAILABLE':
      return {
        label: 'AVAILABLE',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-600',
        description: 'Sanitized & ready for patient intake',
      };
    case 'RESERVED':
      return {
        label: 'RESERVED',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
        description: 'Held for incoming inpatient admission',
      };
    case 'OCCUPIED':
      return {
        label: 'OCCUPIED',
        bg: 'bg-blue-50 text-blue-800 border-blue-300',
        dot: 'bg-blue-600',
        description: 'Currently occupied by admitted patient',
      };
    case 'CLEANING':
      return {
        label: 'CLEANING',
        bg: 'bg-purple-50 text-purple-800 border-purple-300',
        dot: 'bg-purple-500',
        description: 'Under sanitation following patient discharge',
      };
    case 'OUT_OF_SERVICE':
      return {
        label: 'OUT OF SERVICE',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-500',
        description: 'Temporarily unavailable for maintenance',
      };
    default:
      return {
        label: status || 'UNKNOWN',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        description: 'Unspecified state',
      };
  }
}

/**
 * OPD Token State Visual Config
 * States: WAITING, CALLED, IN_SERVICE, COMPLETED, CANCELLED
 */
export function getTokenStatusConfig(status) {
  switch (status) {
    case 'WAITING':
      return {
        label: 'WAITING',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
      };
    case 'CALLED':
      return {
        label: 'CALLED',
        bg: 'bg-sky-50 text-sky-800 border-sky-300',
        dot: 'bg-sky-500',
      };
    case 'IN_SERVICE':
      return {
        label: 'IN SERVICE',
        bg: 'bg-blue-50 text-blue-800 border-blue-300',
        dot: 'bg-blue-600',
      };
    case 'COMPLETED':
      return {
        label: 'COMPLETED',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-600',
      };
    case 'CANCELLED':
      return {
        label: 'CANCELLED',
        bg: 'bg-slate-100 text-slate-600 border-slate-300',
        dot: 'bg-slate-400',
      };
    default:
      return {
        label: status || 'UNKNOWN',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
  }
}

/**
 * Admission Lifecycle Visual Config
 * States: ADMISSION_REQUESTED, PENDING_REVIEW, BED_ASSIGNED, ADMISSION_CONFIRMED, ADMITTED, DISCHARGED, CANCELLED
 */
export function getAdmissionStatusConfig(status) {
  switch (status) {
    case 'ADMISSION_REQUESTED':
      return {
        label: 'REQUESTED',
        fullLabel: 'ADMISSION REQUESTED',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
        step: 1,
      };
    case 'PENDING_REVIEW':
      return {
        label: 'PENDING REVIEW',
        fullLabel: 'PENDING REVIEW',
        bg: 'bg-orange-50 text-orange-800 border-orange-300',
        dot: 'bg-orange-500',
        step: 2,
      };
    case 'BED_ASSIGNED':
      return {
        label: 'BED ASSIGNED',
        fullLabel: 'BED ASSIGNED',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
        dot: 'bg-indigo-500',
        step: 3,
      };
    case 'ADMISSION_CONFIRMED':
      return {
        label: 'CONFIRMED',
        fullLabel: 'ADMISSION CONFIRMED',
        bg: 'bg-cyan-50 text-cyan-800 border-cyan-300',
        dot: 'bg-cyan-600',
        step: 4,
      };
    case 'ADMITTED':
      return {
        label: 'ADMITTED',
        fullLabel: 'PATIENT ADMITTED',
        bg: 'bg-blue-50 text-blue-800 border-blue-300',
        dot: 'bg-blue-600',
        step: 5,
      };
    case 'DISCHARGED':
      return {
        label: 'DISCHARGED',
        fullLabel: 'PATIENT DISCHARGED',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-600',
        step: 6,
      };
    case 'CANCELLED':
      return {
        label: 'CANCELLED',
        fullLabel: 'ADMISSION CANCELLED',
        bg: 'bg-slate-100 text-slate-600 border-slate-300',
        dot: 'bg-slate-400',
        step: 0,
      };
    default:
      return {
        label: status || 'UNKNOWN',
        fullLabel: status || 'UNKNOWN',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        step: 0,
      };
  }
}

/**
 * Inventory Stock Visual Config
 */
export function getInventoryStatusConfig(status) {
  switch (status) {
    case 'IN_STOCK':
      return {
        label: 'IN STOCK',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-600',
      };
    case 'LOW_STOCK':
      return {
        label: 'LOW STOCK',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
      };
    case 'OUT_OF_STOCK':
      return {
        label: 'OUT OF STOCK',
        bg: 'bg-rose-50 text-rose-800 border-rose-300',
        dot: 'bg-rose-600',
      };
    default:
      return {
        label: status || 'UNKNOWN',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
  }
}
