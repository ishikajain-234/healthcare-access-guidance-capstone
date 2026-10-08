import React from 'react';
import {
  getBedStatusConfig,
  getTokenStatusConfig,
  getAdmissionStatusConfig,
  getInventoryStatusConfig,
} from '../../utils/formatters';

export default function StatusBadge({ type, status, size = 'sm' }) {
  let config = {
    label: status || 'UNKNOWN',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  };

  if (type === 'bed') {
    config = getBedStatusConfig(status);
  } else if (type === 'token') {
    config = getTokenStatusConfig(status);
  } else if (type === 'admission') {
    config = getAdmissionStatusConfig(status);
  } else if (type === 'inventory') {
    config = getInventoryStatusConfig(status);
  }

  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold tracking-wide uppercase border rounded ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}
