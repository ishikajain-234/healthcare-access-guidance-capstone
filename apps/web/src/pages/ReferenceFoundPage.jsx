import React, { useState } from 'react';
import { viewOfficialRoute } from '../services/api';

export default function ReferenceFoundPage({ session, record, onProceed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProceed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await viewOfficialRoute(session.session_id);
      onProceed(response.session);
    } catch (err) {
      setError(err.message || 'Failed to proceed to official support route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-purple-200 p-6 sm:p-8 space-y-6">
      {/* Synthetic Data Visual Banner */}
      <div className="border-b border-purple-100 pb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
            Synthetic Reference Data
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
          Simulated reference record found
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          A matching synthetic reference record was identified in the demonstration catalogue.
        </p>
      </div>

      {/* Safe Fields Display Only */}
      <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-xs">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Reference ID
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm mt-1">
              {record?.package_id || 'N/A'}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-xs">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Category
            </span>
            <p className="font-medium text-slate-900 text-sm mt-1">
              {record?.category_id || 'N/A'}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-xs sm:col-span-2">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Data Status
            </span>
            <div className="mt-1 flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-600"></span>
              <span className="font-semibold text-purple-800 text-sm">
                {record?.data_status || 'SIMULATED_TEST_RECORD'}
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Notice */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed space-y-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800 block">
            Simulation Notice
          </span>
          <p>
            {record?.simulation_notice || 'Fictional demonstration record for academic evaluation. No price, eligibility, coverage, availability, or medical recommendation is implied or determined.'}
          </p>
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
