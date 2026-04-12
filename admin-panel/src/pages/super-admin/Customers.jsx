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
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold shrink-0">
          {v?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{v}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      </div>
    )},
    { key: 'phonenumber', label: 'Phone' },
    { key: 'createdAt', label: 'Joined', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'role', label: 'Role', render: (v) => (
      <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">{v}</span>
    )},
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Customers</h2>
        <p className="text-sm text-gray-400">{total} registered customers</p>
      </div>
      <DataTable columns={columns} data={customers} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search by name or email..." />
    </div>
  );
}
