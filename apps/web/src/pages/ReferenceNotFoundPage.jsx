import React, { useState } from 'react';
import { viewSupportRoute } from '../services/api';

export default function ReferenceNotFoundPage({ session, categoryId, onProceed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProceed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await viewSupportRoute(session.session_id);
      onProceed(response.session);
    } catch (err) {
      setError(err.message || 'Failed to proceed to support channels.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-amber-300 p-6 sm:p-8 space-y-6">
      {/* No-Match Recovery Visual Header */}
      <div className="border-b border-amber-200 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
          No-Match Recovery Route
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
          No matching record in this limited demonstration dataset
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          The selected category was not found in the prototype's restricted demonstration catalogue.
        </p>
      </div>

      {/* Explanation of Prototype Data Coverage Limitation */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 space-y-3.5 text-xs text-amber-950">
        <div className="flex items-start space-x-2.5">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
          </svg>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-amber-900">
              Prototype Data-Coverage Limitation Notice
            </h3>
            <p className="leading-relaxed text-amber-900">
              This result occurs solely because of a limited demonstration dataset loaded into this academic prototype. Our seed repository contains only a small set of mock demonstration records.
            </p>
          </div>
        </div>

        {/* Reassurance Notice - Do not say support, coverage, or treatment access is unavailable */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 leading-relaxed font-medium">
          <strong>Important Clarification:</strong> A missing reference record in this prototype does not mean that healthcare support, scheme coverage, or medical treatment access is unavailable. Real-world eligibility and services must always be confirmed through authorized official channels.
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleProceed}
        disabled={loading}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-medium rounded-lg text-sm transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Advancing to Information Route...' : 'View Information & Support Route'}
      </button>
    </div>
  );
}
