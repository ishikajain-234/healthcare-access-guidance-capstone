import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  badge = 'SIMULATED DEMO',
  actions = null,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 mb-6 border-b border-slate-200 gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-terracotta-50 text-terracotta-800 border border-terracotta-300 rounded">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
