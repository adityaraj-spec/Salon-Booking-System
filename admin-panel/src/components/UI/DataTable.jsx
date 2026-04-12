import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

/**
 * DataTable — Generic, paginated, searchable table.
 *
 * Props:
 *  - columns: [{ key, label, render? }]
 *  - data:    array of row objects
 *  - total:   total records (server-side pagination)
 *  - page, limit, onPageChange, onLimitChange
 *  - onSearch (optional): called with search string
 *  - loading
 *  - actions: (row) => JSX — renders action buttons per row
 *  - searchPlaceholder
 */
export default function DataTable({
  columns, data, total = 0, page = 1, limit = 10,
  onPageChange, onLimitChange, onSearch,
  loading, actions, searchPlaceholder = 'Search...'
}) {
  const [searchVal, setSearchVal] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleSearch = (e) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 gap-4">
        {onSearch && (
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchVal}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>rows</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map(col => (
                <th key={col.key} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-400">No records found</td></tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row._id || idx} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50 text-sm text-gray-500">
        <span>Showing {from}–{to} of {total}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) p = page - 2 + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
