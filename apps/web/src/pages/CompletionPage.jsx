import React, { useEffect, useState } from 'react';
import { getGuidanceSession } from '../services/api';
import StateBadge from '../components/StateBadge';

export default function CompletionPage({ session, onRestart }) {
  const [sessionData, setSessionData] = useState(session || null);

  const sessionId = sessionData?.session_id || session?.session_id || 'N/A';
  const finalState = sessionData?.current_state || session?.current_state || 'GUIDANCE_COMPLETED';

  useEffect(() => {
    const sId = session?.session_id || session?.id;
    if (sId) {
      getGuidanceSession(sId)
        .then((data) => {
          if (data?.session) {
            setSessionData({ ...data.session, events: data.events });
          } else {
            setSessionData(data);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const timelineEvents = sessionData?.events || sessionData?.event_timeline || [];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-emerald-200 p-6 sm:p-8 space-y-6">
      {/* Completed State Visual Header */}
      <div className="text-center space-y-3 pb-4 border-b border-emerald-100">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-1">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Guidance Session Completed
        </h2>
        <div className="flex justify-center">
          <StateBadge state={finalState} />
        </div>
      </div>

      {/* Session Metadata Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">
              Anonymous Session ID
            </span>
            <p className="font-mono font-bold text-indigo-700 text-sm mt-0.5 break-all">
              {sessionId}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">
              Final Lifecycle State
            </span>
            <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
              {finalState}
            </p>
          </div>
        </div>

        {/* Append-Only Event Timeline */}
        <div className="pt-3 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1.5">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Append-Only Guidance Event Timeline</span>
          </h3>

          {timelineEvents.length > 0 ? (
            <div className="space-y-1.5 font-mono text-xs">
              {timelineEvents.map((e, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:justify-between py-1.5 px-2 bg-white rounded border border-slate-100 text-[11px]"
                >
                  <span className="font-semibold text-slate-800">
                    {e.event_type || `${e.from_state} → ${e.to_state}`}
                  </span>
                  <span className="text-slate-400">
                    {e.created_at ? new Date(e.created_at).toLocaleTimeString() : 'Recorded'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Timeline events recorded in audit log.</p>
          )}
        </div>
      </div>

      {/* Repeated Prominent Synthetic-Data Disclaimer */}
      <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 leading-relaxed space-y-1">
        <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800 block">
          Synthetic-Data &amp; Safety Disclaimer
        </span>
        <p>
          This completes the demonstration session. All information viewed was generated from a limited synthetic dataset for academic prototype evaluation. This tool does not provide medical evaluation, verify eligibility, or guarantee healthcare access.
        </p>
      </div>

      {/* Restart Button */}
      <button
        type="button"
        onClick={onRestart}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm cursor-pointer"
      >
        Start New Anonymous Demonstration Session
      </button>
    </div>
  );
}
