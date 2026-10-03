import React, { useState } from 'react';
import { startGuidanceSession } from '../services/api';

export default function LandingPage({ onSessionStarted, onNavigateAdmin }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!acknowledged) return;
    setLoading(true);
    setError(null);
    try {
      const response = await startGuidanceSession();
      onSessionStarted(response);
    } catch (err) {
      setError(err.message || 'Failed to initialize guidance session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-block text-xs uppercase tracking-wider font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
          Academic Prototype Demonstration
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Healthcare Access Guidance Prototype
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Understand public healthcare reference information and find the appropriate official information or support pathway.
        </p>
      </div>

      {/* Prominent Synthetic-Data & Safety Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center space-x-2 text-amber-900 font-semibold text-sm">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Mandatory Synthetic Data &amp; Safety Disclaimer</span>
        </div>
        <ul className="text-xs text-amber-800 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li><strong>Simulated demonstration dataset:</strong> All records are synthetic mock entries for academic evaluation only.</li>
          <li><strong>No medical advice or triage:</strong> This platform does not assess symptoms, diagnose illness, or recommend medical treatment.</li>
          <li><strong>No eligibility or authorization:</strong> This prototype does not determine scheme eligibility, coverage approval, hospital admission, or cashless benefits.</li>
          <li><strong>Zero personal data:</strong> No names, IDs, addresses, phone numbers, or free-text health details are ever collected.</li>
        </ul>
      </div>

      {/* Acknowledgment Checkbox */}
      <div className="flex items-start space-x-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
        <input
          type="checkbox"
          id="student-prototype-ack"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <label htmlFor="student-prototype-ack" className="text-xs sm:text-sm text-slate-700 font-medium cursor-pointer leading-snug">
          I understand this is a simulated student prototype.
        </label>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={!acknowledged || loading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded-lg text-sm transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? 'Initializing Guidance Session...' : 'Start Anonymous Guidance Session'}
        </button>

        <button
          type="button"
          onClick={onNavigateAdmin}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg text-sm transition shadow-sm cursor-pointer"
        >
          Admin Analytics
        </button>
      </div>
    </div>
  );
}
