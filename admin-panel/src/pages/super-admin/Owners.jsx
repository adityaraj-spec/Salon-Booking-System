import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

function OwnerForm({ onSave, onClose }) {
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', phonenumber: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/owners', form);
      toast.success('Owner account created');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create owner');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[['fullName','Full Name',true],['email','Email',true],['username','Username',true],
        ['phonenumber','Phone Number',true],['password','Password',true]].map(([k,label,req]) => (
        <div key={k}>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">{label}</label>
          <input type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
            value={form[k]} onChange={e => set(k, e.target.value)} required={req}
            className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all" />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-gray-50 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-[#1a1a1a] hover:bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-60">
          {saving ? 'Creating...' : 'Create Owner Account'}
        </button>
      </div>
    </form>
  );
}

export default function SuperOwners() {
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/owners', { params: { page, limit, search } });
      setOwners(r.data.data.owners);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load owners'); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/owners/${confirm.id}`);
      toast.success('Owner deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); setConfirm({ open: false, id: null }); }
  };

  const columns = [
    { key: 'fullName', label: 'Name', render: (v, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/10">{v?.charAt(0)}</div>
        <div>
          <p className="font-bold text-[#1a1a1a] text-sm">{v}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.email}</p>
        </div>
      </div>
    )},
    { key: 'phonenumber', label: 'Phone', render: (v) => <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v || '—'}</span> },
    { key: 'salon', label: 'Assigned Salon', render: (v) => v
      ? <div className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]"><Store size={14} />{v.name}</div>
      : <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Not assigned</span>
    },
    { key: 'createdAt', label: 'Joined', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            Salon Owners
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">{total} verified owners registered</p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-3 bg-[#1a1a1a] hover:bg-black text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-black/10 hover:scale-[1.02]">
          <Plus size={16} className="text-[#D4AF37]" /> Create New Owner
        </button>
      </div>

      <DataTable columns={columns} data={owners} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search by name or email..."
        actions={(row) => (
          <button onClick={() => setConfirm({ open: true, id: row._id })}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm">
            <Trash2 size={14} />
          </button>
        )}
      />

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Create New Salon Owner" size="sm">
        <OwnerForm onSave={() => { setAddModal(false); fetch(); }} onClose={() => setAddModal(false)} />
      </Modal>

      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Owner Account" message="This will permanently delete this owner's account. Their salon will remain."
        confirmText="Delete Owner" />
    </div>
  );
}
