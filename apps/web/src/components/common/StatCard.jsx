import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default', // default, warning, success, info, terracotta
}) {
  const borderVariants = {
    default: 'border-slate-200',
    warning: 'border-amber-300',
    success: 'border-emerald-300',
    info: 'border-blue-300',
    terracotta: 'border-terracotta-300',
  };

  const textVariants = {
    default: 'text-slate-900',
    warning: 'text-amber-800',
    success: 'text-emerald-800',
    info: 'text-blue-800',
    terracotta: 'text-terracotta-800',
  };

  const iconBgVariants = {
    default: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-blue-100 text-blue-700',
    terracotta: 'bg-terracotta-100 text-terracotta-700',
  };

  return (
    <div className={`bg-white border rounded p-4 ${borderVariants[variant] || borderVariants.default}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <span className={`p-1.5 rounded ${iconBgVariants[variant] || iconBgVariants.default}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${textVariants[variant] || textVariants.default}`}>
          {value}
        </span>
      </div>
      {subtext && (
        <p className="mt-1 text-xs text-slate-500">
          {subtext}
        </p>
      )}
    </div>
  );
}
