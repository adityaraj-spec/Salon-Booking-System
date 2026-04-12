import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-700 font-bold uppercase tracking-widest',
  confirmed: 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold uppercase tracking-widest',
  completed: 'bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest',
  cancelled: 'bg-red-100 text-red-600 font-bold uppercase tracking-widest',
  rejected:  'bg-gray-100 text-gray-600 font-bold uppercase tracking-widest',
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
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{v?.email}</p>
      </div>
    )},
    { key: 'salon', label: 'Salon', render: (v) => v?.name || '—' },
    { key: 'serviceNames', label: 'Services', render: (v) => (
      <div className="flex flex-wrap gap-1.5">
        {(v || []).slice(0, 2).map((s, i) => (
          <span key={i} className="bg-gray-50 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">{s}</span>
        ))}
        {v?.length > 2 && <span className="text-[10px] font-black text-[#D4AF37] ml-1">+{v.length - 2} MORE</span>}
      </div>
    )},
    { key: 'date', label: 'Date & Time', render: (v, row) => (
      <span className="text-sm text-gray-700">{v} {row.time ? `@ ${row.time}` : ''}</span>
    )},
    { key: 'totalAmount', label: 'Amount', render: (v) => v ? <span className="font-serif font-black text-[#1a1a1a]">₹{v}</span> : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select value={v} onChange={e => updateStatus(row._id, e.target.value)}
        className={`text-[9px] font-black px-3 py-2 rounded-full border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all ${STATUS_BADGE[v]}`}>
        {ALL_STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
      </select>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            Platform Bookings
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{total} total bookings across all salons</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-white border-none rounded-full px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-600 focus:outline-none shadow-sm transition-all focus:ring-2 focus:ring-[#D4AF37]/30">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={bookings} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit}
      />
    </div>
  );
}
