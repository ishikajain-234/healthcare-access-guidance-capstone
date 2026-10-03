import React from 'react';

export default function Header({
  currentSession,
  currentView,
  onNavigateAdmin,
  onNavigateHome,
}) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-left text-indigo-700 hover:text-indigo-900"
        >
          <p className="font-bold text-base sm:text-lg">
            Healthcare Access Guidance Prototype
          </p>
          <p className="text-xs text-slate-500">
            Synthetic academic demonstration
          </p>
        </button>

        <div className="flex items-center gap-3">
          {currentSession && (
            <span className="hidden sm:inline text-xs text-slate-500">
              Anonymous session active
            </span>
          )}

          <button
            type="button"
            onClick={onNavigateAdmin}
            className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Admin Analytics
          </button>
        </div>
      </div>

      {currentView === 'ADMIN' && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-600">
          Local demonstration analytics only. Authorization is required before deployment.
        </div>
      )}
    </header>
  );
}
