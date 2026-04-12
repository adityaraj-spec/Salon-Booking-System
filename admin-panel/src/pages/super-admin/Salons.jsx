import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

function SalonForm({ initial, owners, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', city: initial?.city || '',
    state: initial?.state || '', address: initial?.address || '',
    pincode: initial?.pincode || '', contactNumber: initial?.contactNumber || '',
    openingHours: initial?.openingHours || '', closingHours: initial?.closingHours || '',
    ownerId: initial?.owner?._id || initial?.ownerId || '',
    description: initial?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?._id) {
        await api.patch(`/salons/${initial._id}`, form);
        toast.success('Salon updated');
      } else {
        await api.post('/admin/salons', form);
        toast.success('Salon created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, k, type = 'text', placeholder, required }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-gray-50" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Salon Name *" k="name" required />
        <F label="City *" k="city" required />
        <F label="State" k="state" />
        <F label="Pincode" k="pincode" />
        <F label="Phone" k="contactNumber" />
        <F label="Opening Hours" k="openingHours" placeholder="09:00" />
        <F label="Closing Hours" k="closingHours" placeholder="21:00" />
      </div>
      <F label="Address *" k="address" required />
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Owner *</label>
        <select value={form.ownerId} onChange={e => set('ownerId', e.target.value)} required
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50">
          <option value="">Select an owner</option>
          {owners.map(o => <option key={o._id} value={o._id}>{o.fullName} ({o.email})</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : (initial ? 'Update Salon' : 'Create Salon')}
        </button>
      </div>
    </form>
  );
}

export default function SuperSalons() {
  const [salons, setSalons] = useState([]);
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, salon: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetchSalons = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/salons', { params: { page, limit, search } });
      setSalons(r.data.data.salons);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load salons'); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetchSalons(); }, [fetchSalons]);

  useEffect(() => {
    api.get('/admin/owners', { params: { limit: 100 } })
      .then(r => setOwners(r.data.data.owners))
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/salons/${confirm.id}`);
      toast.success('Salon deleted');
      fetchSalons();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); setConfirm({ open: false, id: null }); }
  };

  const columns = [
    { key: 'name', label: 'Salon Name', render: (v, row) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <Store size={14} className="text-orange-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{v}</p>
          <p className="text-xs text-gray-400">{row.city}</p>
        </div>
      </div>
    )},
    { key: 'owner', label: 'Owner', render: (v) => v?.fullName || '—' },
    { key: 'contactNumber', label: 'Phone' },
    { key: 'isOpen', label: 'Status', render: (v) => (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    )},
    { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Salons</h2>
          <p className="text-sm text-gray-400">{total} salons registered on the platform</p>
        </div>
        <button
          onClick={() => setModal({ open: true, salon: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-colors"
        >
          <Plus size={16} /> Add Salon
        </button>
      </div>

      <DataTable
        columns={columns} data={salons} total={total} page={page} limit={limit}
        loading={loading}
        onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search by name or city..."
        actions={(row) => (
          <>
            <button onClick={() => setModal({ open: true, salon: row })}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Pencil size={15} />
            </button>
            <button onClick={() => setConfirm({ open: true, id: row._id })}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, salon: null })}
        title={modal.salon ? 'Edit Salon' : 'Add New Salon'} size="lg">
        <SalonForm initial={modal.salon} owners={owners}
          onSave={() => { setModal({ open: false, salon: null }); fetchSalons(); }}
          onClose={() => setModal({ open: false, salon: null })} />
      </Modal>

      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Salon" message="This will permanently delete the salon and all its data. This action cannot be undone."
        confirmText="Delete Salon" />
    </div>
  );
}
