import React from 'react';

export default function StateBadge({ state }) {
  const getBadgeStyle = (s) => {
    switch (s) {
      case 'GUIDANCE_STARTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SERVICE_SEARCHED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PUBLIC_REFERENCE_FOUND':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PUBLIC_REFERENCE_NOT_FOUND':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'OFFICIAL_VERIFICATION_ROUTE_SHOWN':
      case 'SUPPORT_ROUTE_SHOWN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'GUIDANCE_COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(state)}`}>
      STATE: {state}
    </span>
  );
}
