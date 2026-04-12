import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';

export default function SuperCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/customers', { params: { page, limit, search } });
      setCustomers(r.data.data.customers);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const columns = [
    { key: 'fullName', label: 'Name', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/10 shrink-0">
          {v?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-[#1a1a1a] text-sm">{v}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.email}</p>
        </div>
      </div>
    )},
    { key: 'phonenumber', label: 'Phone', render: (v) => <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v || '—'}</span> },
    { key: 'createdAt', label: 'Joined', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'role', label: 'Role', render: (v) => (
      <span className="bg-[#1a1a1a] text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{v}</span>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="mb-8 mt-2">
        <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
          Customer Directory
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{total} verified platform users</p>
      </div>
      <DataTable columns={columns} data={customers} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search by name or email..." />
    </div>
  );
}
