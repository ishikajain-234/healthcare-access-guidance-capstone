import React from 'react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r shadow-sm">
      <div className="flex items-start">
        <svg
          className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">
            Mandatory Student Prototype &amp; Safety Notice
          </p>
          <p>
            This is a student prototype using simulated demonstration data. It provides general
            information-routing only. It does not confirm eligibility, coverage, approval, hospital
            availability, cashless treatment, medical need, or any legal status.
          </p>
        </div>
      </div>
    </div>
  );
}

