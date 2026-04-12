import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';

const STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  rejected:  'bg-gray-100 text-gray-600',
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
        <p className="font-semibold text-gray-900 text-sm">{v?.fullName || 'Guest'}</p>
        <p className="text-xs text-gray-400">{v?.email}</p>
      </div>
    )},
    { key: 'salon', label: 'Salon', render: (v) => v?.name || '—' },
    { key: 'serviceNames', label: 'Services', render: (v) => (
      <div className="flex flex-wrap gap-1">
        {(v || []).slice(0, 2).map((s, i) => (
          <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{s}</span>
        ))}
        {v?.length > 2 && <span className="text-xs text-gray-400">+{v.length - 2}</span>}
      </div>
    )},
    { key: 'date', label: 'Date & Time', render: (v, row) => (
      <span className="text-sm text-gray-700">{v} {row.time ? `@ ${row.time}` : ''}</span>
    )},
    { key: 'totalAmount', label: 'Amount', render: (v) => v ? <span className="font-bold text-gray-900">₹{v}</span> : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select value={v} onChange={e => updateStatus(row._id, e.target.value)}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${STATUS_BADGE[v]}`}>
        {ALL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bookings</h2>
          <p className="text-sm text-gray-400">{total} total bookings across all salons</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
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
