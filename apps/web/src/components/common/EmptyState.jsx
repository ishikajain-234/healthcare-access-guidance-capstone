import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There is currently no operational data available for this filter or hospital.',
  action = null,
  icon: Icon = Inbox,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-300 rounded bg-slate-50/50">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800">
        {title}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
