import React, { useState, useEffect } from 'react';
import { getOfficialSupportRoutes, completeGuidanceSession } from '../services/api';

export default function OfficialRoutePage({ session, record, onComplete }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRoutes() {
      setLoading(true);
      try {
        const data = await getOfficialSupportRoutes();
        setRouteInfo(data);
      } catch (err) {
        // Fallback gracefully without breaking UI
      } finally {
        setLoading(false);
      }
    }
    loadRoutes();
  }, []);

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      const response = await completeGuidanceSession(session.session_id);
      onComplete(response.session);
    } catch (err) {
      setError(err.message || 'Failed to complete guidance session.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-sky-200 p-6 sm:p-8 space-y-6">
      {/* Information Route Header */}
      <div className="border-b border-sky-100 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
          Official Information Route
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
          Information route shown
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Public reference pathway to authorized verification channels.
        </p>
      </div>

      {/* Primary Guidance Card */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-5 space-y-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-sky-950 leading-relaxed">
              For current official information or verification guidance, use the relevant official scheme channel or authorized hospital support desk.
            </p>
          </div>
        </div>

        {/* Mandatory Disclaimer */}
        <div className="p-3 bg-white/80 border border-sky-200 rounded-md text-xs text-sky-900 leading-relaxed">
          <strong>Mandatory Notice:</strong> This prototype does not determine eligibility, coverage, approval, availability, cashless treatment, or legal status.
        </div>
      </div>

      {/* Official Directory Reference Channels */}
      {routeInfo?.routes && routeInfo.routes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Authorized Reference Contacts
          </h3>
          <div className="space-y-2">
            {routeInfo.routes.map((route, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-900">{route.channel_name}</h4>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {route.verification_status}
                  </span>
                </div>
                <p className="text-slate-600 font-mono text-[11px]">
                  Contact: <span className="font-semibold">{route.contact_value}</span>
                </p>
                <p className="text-slate-500 mt-1">{route.guidance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={completing || loading}
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-medium rounded-lg text-sm transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {completing ? 'Completing Session...' : 'Complete Guidance Session'}
      </button>
    </div>
  );
}
