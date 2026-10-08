import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to load operational data',
  message,
  onRetry,
}) {
  return (
    <div className="border border-rose-200 bg-rose-50/60 rounded p-4 text-rose-900 my-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
            {title}
          </h4>
          <p className="text-xs text-rose-700 mt-1 font-mono">
            {message || 'An unexpected error occurred during request processing.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
