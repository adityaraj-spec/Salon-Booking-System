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
    <div className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden transition-all">
      {/* Top toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-5 py-4 border-b border-gray-50 gap-4">
        {onSearch && (
          <div className="relative w-full sm:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchVal}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-3 text-sm bg-gray-50/50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all font-medium"
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto sm:ml-0 text-sm text-gray-500">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="border-none bg-gray-50 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-[10px] font-bold uppercase tracking-widest">rows</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50">
              {columns.map(col => (
                <th key={col.key} className="text-left px-4 md:px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-right px-4 md:px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>}
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
                    <td key={col.key} className="px-4 md:px-5 py-3.5 text-gray-700 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 md:px-5 py-3.5 text-right">
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
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
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
                className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition-all ${
                  p === page ? 'bg-[#1a1a1a] text-white shadow-lg shadow-black/10' : 'hover:bg-gray-100 text-gray-600'
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
