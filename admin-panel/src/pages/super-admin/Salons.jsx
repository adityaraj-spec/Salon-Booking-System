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
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all font-sans" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 resize-none transition-all" />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Assign Owner *</label>
        <select value={form.ownerId} onChange={e => set('ownerId', e.target.value)} required
          className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all">
          <option value="">Select an owner</option>
          {owners.map(o => <option key={o._id} value={o._id}>{o.fullName} ({o.email})</option>)}
        </select>
      </div>
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-gray-50 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-all">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-[#1a1a1a] hover:bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-60">
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[14px] bg-[#D4AF37]/10 flex items-center justify-center shrink-0 border border-[#D4AF37]/10">
          <Store size={18} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="font-bold text-[#1a1a1a] text-sm">{v}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.city}</p>
        </div>
      </div>
    )},
    { key: 'owner', label: 'Owner', render: (v) => v?.fullName || '—' },
    { key: 'contactNumber', label: 'Phone' },
    { key: 'isOpen', label: 'Status', render: (v) => (
      <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    )},
    { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            Salon Registry
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{total} salons registered on the platform</p>
        </div>
        <button
          onClick={() => setModal({ open: true, salon: null })}
          className="flex items-center gap-3 bg-[#1a1a1a] hover:bg-black text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-black/10 hover:scale-[1.02]"
        >
          <Plus size={16} className="text-[#D4AF37]" /> Register New Salon
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
              className="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-xl transition-all shadow-sm">
              <Pencil size={14} />
            </button>
            <button onClick={() => setConfirm({ open: true, id: row._id })}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm">
              <Trash2 size={14} />
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
