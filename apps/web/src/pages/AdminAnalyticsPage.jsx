import React, { useState, useEffect } from 'react';
import { getAdminAnalyticsSummary, getDataQualitySummary } from '../services/api';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, dqRes] = await Promise.all([
        getAdminAnalyticsSummary().catch(() => null),
        getDataQualitySummary().catch(() => null),
      ]);
      setAnalytics(analyticsRes);
      setDataQuality(dqRes);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            Administrative Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1.5">
            Prototype Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated lifecycle metrics and telemetry across anonymous demonstration sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg text-xs sm:text-sm transition shadow-sm cursor-pointer"
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Mandatory Admin Disclosures */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-700">
        <div className="flex items-center space-x-2 text-indigo-900 font-semibold">
          <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
          </svg>
          <span>Deployment &amp; Simulation Notes</span>
        </div>
        <p className="text-slate-600">
          All analytics are generated from synthetic student-demo sessions.
        </p>
        <p className="text-amber-800 font-medium bg-amber-50 border border-amber-200 rounded p-2.5">
          Admin endpoints require authorization before deployment.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {loading && !analytics ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Loading prototype analytics...
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sessions Started */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Sessions started
              </span>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {analytics?.total_sessions ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Total initialized sessions
              </span>
            </div>

            {/* Sessions Completed */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Sessions completed
              </span>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {analytics?.completed_sessions ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Finished guidance sessions
              </span>
            </div>

            {/* Completion Rate */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Completion rate
              </span>
              <p className="text-3xl font-bold text-indigo-600 mt-2">
                {analytics?.completion_rate_percent ?? 0}%
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Percentage successfully completed
              </span>
            </div>

            {/* Reference Found Count */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Reference found count
              </span>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {analytics?.reference_found_count ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Synthetic catalogue matches
              </span>
            </div>

            {/* Reference Not Found Count */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Reference not found count
              </span>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {analytics?.reference_not_found_count ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                No-match recovery pathways
              </span>
            </div>

            {/* Data Quality Integrity */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Data quality check flags
              </span>
              <p className="text-3xl font-bold text-slate-700 mt-2">
                {dataQuality?.total_issues ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Audit integrity check alerts
              </span>
            </div>
          </div>

          {/* Event Counts by State */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Event counts by state
              </h3>
              <span className="text-xs text-slate-400">Lifecycle State Ledger</span>
            </div>

            {analytics?.event_counts && analytics.event_counts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {analytics.event_counts.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                    <span className="font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                      {item.event_type}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                No state transition events recorded yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
