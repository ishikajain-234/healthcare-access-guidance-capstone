import React from 'react';
import Modal from './Modal';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  confirmVariant = 'primary', // primary, danger, warning
  isLoading = false,
  error = null,
}) {
  const buttonVariants = {
    primary: 'bg-terracotta-600 hover:bg-terracotta-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {confirmVariant === 'danger' || confirmVariant === 'warning' ? (
            <AlertTriangle className={`w-5 h-5 shrink-0 ${confirmVariant === 'danger' ? 'text-rose-600' : 'text-amber-600'}`} />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-terracotta-600" />
          )}
          <p className="text-xs text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-mono">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition disabled:opacity-50 ${buttonVariants[confirmVariant] || buttonVariants.primary}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
