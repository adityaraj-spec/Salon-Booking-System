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
          <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
          <input type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
            value={form[k]} onChange={e => set(k, e.target.value)} required={req}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Creating...' : 'Create Owner'}
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
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">{v?.charAt(0)}</div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{v}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      </div>
    )},
    { key: 'phonenumber', label: 'Phone' },
    { key: 'salon', label: 'Assigned Salon', render: (v) => v
      ? <div className="flex items-center gap-1.5 text-sm text-blue-600"><Store size={13} />{v.name}</div>
      : <span className="text-xs text-gray-400">Not assigned</span>
    },
    { key: 'createdAt', label: 'Joined', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Salon Owners</h2>
          <p className="text-sm text-gray-400">{total} owners registered</p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-colors">
          <Plus size={16} /> Add Owner
        </button>
      </div>

      <DataTable columns={columns} data={owners} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search by name or email..."
        actions={(row) => (
          <button onClick={() => setConfirm({ open: true, id: row._id })}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} />
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
