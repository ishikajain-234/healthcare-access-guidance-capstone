import React from 'react';

export default function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
