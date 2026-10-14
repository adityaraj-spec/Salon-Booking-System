import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-800 font-semibold',
  confirmed: 'bg-[#D4AF37]/15 text-[#997917] font-semibold',
  completed: 'bg-emerald-100 text-emerald-800 font-semibold',
  cancelled: 'bg-red-100 text-red-700 font-semibold',
  rejected:  'bg-gray-100 text-gray-700 font-semibold',
};

const ALL_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

export default function SuperBookings() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/bookings', { params: { page, limit, status } });
      setBookings(r.data.data.bookings);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [page, limit, status]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/bookings/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  const columns = [
    { key: 'customer', label: 'Customer', render: (v) => (
      <div>
        <p className="font-bold text-[#1a1a1a] text-sm">{v?.fullName || 'Guest'}</p>
        <p className="text-xs font-normal text-gray-500 mt-0.5">{v?.email || '—'}</p>
      </div>
    )},
    { key: 'salon', label: 'Salon', render: (v) => <span className="text-sm font-medium text-gray-800">{v?.name || '—'}</span> },
    { key: 'serviceNames', label: 'Services', render: (v) => (
      <div className="flex flex-wrap items-center gap-1.5">
        {(v || []).slice(0, 2).map((s, i) => (
          <span key={i} className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-lg capitalize">{s}</span>
        ))}
        {v?.length > 2 && <span className="text-xs font-semibold text-[#D4AF37] ml-1">+{v.length - 2} more</span>}
      </div>
    )},
    { key: 'date', label: 'Date & Time', render: (v, row) => (
      <span className="text-sm text-gray-700 font-medium">{v} {row.time ? `@ ${row.time}` : ''}</span>
    )},
    { key: 'totalAmount', label: 'Amount', render: (v) => v ? <span className="font-serif font-black text-[#1a1a1a] text-sm">₹{v}</span> : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select value={v} onChange={e => updateStatus(row._id, e.target.value)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all capitalize ${STATUS_BADGE[v]}`}>
        {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-black text-[#1a1a1a]">
            Platform Bookings
          </h1>
          <p className="text-xs font-medium text-gray-500 mt-1">{total} total bookings across all salons</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-semibold text-gray-700 focus:outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#D4AF37]/30">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={bookings} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit}
      />
    </div>
  );
}
