import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading operational data...', minHeight = 'h-48' }) {
  return (
    <div className={`flex flex-col items-center justify-center ${minHeight} text-slate-500`}>
      <Loader2 className="w-6 h-6 animate-spin text-terracotta-600 mb-2" />
      <p className="text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
}
