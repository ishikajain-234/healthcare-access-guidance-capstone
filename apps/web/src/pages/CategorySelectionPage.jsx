import React, { useState } from 'react';
import { CONTROLLED_CATEGORIES } from '../constants/categories';
import { searchReferencePackage } from '../services/api';

export default function CategorySelectionPage({ session, onSearchSuccess, onSearchNotFound }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    setError(null);
    try {
      const response = await searchReferencePackage(session.session_id, selectedCategory);
      if (response.reference_found) {
        onSearchSuccess(response.session, response.package);
      } else {
        onSearchNotFound(response.session, selectedCategory);
      }
    } catch (err) {
      setError(err.message || 'Error querying reference catalogue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <span className="inline-block text-xs uppercase tracking-wider font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full mb-2">
          Step 1: Reference Category Lookup
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Choose a demonstration reference category
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          Select one of the controlled demonstration categories from the dropdown below to check the synthetic reference catalogue.
        </p>
      </div>

      {/* Safety Boundary Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 flex items-start space-x-2.5">
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
        <p>
          Controlled category navigation only. Free-text search, symptom collection, personal identifiers, and clinical triage are strictly disabled.
        </p>
      </div>

      {/* Controlled Dropdown Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="category-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Demonstration Reference Category
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
          >
            <option value="">-- Choose a demonstration category --</option>
            {CONTROLLED_CATEGORIES.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Category Details Preview */}
        {selectedCategory && (
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-slate-700">Category Identifier:</span>{' '}
            <span className="font-mono text-indigo-700">{selectedCategory}</span>
            <p className="text-slate-500 italic mt-0.5">
              {CONTROLLED_CATEGORIES.find((c) => c.category_id === selectedCategory)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSearch}
        disabled={!selectedCategory || loading}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded-lg text-sm transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Looking Up Reference Guidance...' : 'Look Up Reference Guidance'}
      </button>
    </div>
  );
}
