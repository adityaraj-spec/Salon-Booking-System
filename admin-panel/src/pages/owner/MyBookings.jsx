import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-700 font-bold uppercase tracking-widest',
  confirmed: 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold uppercase tracking-widest',
  completed: 'bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest text-[10px]',
  cancelled: 'bg-red-100 text-red-600 font-bold uppercase tracking-widest',
  rejected:  'bg-gray-100 text-gray-600 font-bold uppercase tracking-widest',
};

const ALL_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/bookings', { params: { page, limit, status } });
      setBookings(r.data.data.bookings);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [page, limit, status]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/owner/bookings/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetch();
    } catch { toast.error('Failed to update status'); }
  };

  const columns = [
    { key: 'customer', label: 'Customer', render: (v) => (
      <div>
        <p className="font-bold text-[#1a1a1a] text-sm">{v?.fullName || 'Guest'}</p>
        <p className="text-[11px] font-medium text-gray-400 mt-0.5 lowercase">{v?.email}</p>
        {v?.phonenumber && <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 border-t border-gray-50 pt-1">{v.phonenumber}</p>}
      </div>
    )},
    { key: 'serviceNames', label: 'Services', render: (v) => (
      <div className="flex flex-wrap gap-1.5">
        {(v || []).map((s, i) => (
          <span key={i} className="bg-gray-50 text-[10px] font-bold text-gray-500 border border-gray-100 px-3 py-1 rounded-full uppercase tracking-widest transition-all hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/20 hover:text-[#D4AF37]">{s}</span>
        ))}
      </div>
    )},
    { key: 'date', label: 'Date & Time', render: (v, row) => (
      <span className="text-sm text-gray-700">{v} {row.time ? `@ ${row.time}` : ''}</span>
    )},
    { key: 'totalAmount', label: 'Amount', render: (v) => v ? <span className="font-black font-serif text-[#1a1a1a] text-base">₹{v}</span> : '—' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select value={v} onChange={e => updateStatus(row._id, e.target.value)}
        className={`text-[10px] font-black px-4 py-2 rounded-full border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all shadow-sm ${STATUS_BADGE[v]}`}>
        {ALL_STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
      </select>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            My Bookings
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Manage appointments for your salon</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-white border-none rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 shadow-xl shadow-black/5 transition-all">
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
