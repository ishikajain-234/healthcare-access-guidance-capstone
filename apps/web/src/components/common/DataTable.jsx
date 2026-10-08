import React from 'react';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export default function DataTable({
  columns,
  data,
  keyExtractor = (item, idx) => item.id || idx,
  isLoading = false,
  emptyMessage = 'No operational records matching current criteria.',
  emptyTitle = 'No records found',
  emptyAction = null,
}) {
  if (isLoading) {
    return (
      <div className="border border-slate-200 rounded bg-white">
        <LoadingState />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="border border-slate-200 rounded bg-white p-4">
        <EmptyState title={emptyTitle} description={emptyMessage} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold text-slate-600 select-none">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-4 py-3 ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`px-4 py-3 ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(item, rowIdx) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
