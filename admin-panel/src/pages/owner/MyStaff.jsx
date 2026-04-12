import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

function StaffForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', role: initial?.role || '',
    experience: initial?.experience || '', skills: initial?.skills?.join(', ') || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) };
      if (initial?._id) {
        await api.put(`/owner/staff/${initial._id}`, payload);
        toast.success('Staff updated');
      } else {
        await api.post('/owner/staff', payload);
        toast.success('Staff added');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[['name','Name *',true,'text'],['role','Role / Title',false,'text'],
          ['experience','Experience (Years)',false,'number']].map(([k,label,req,type]) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required={req === true}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Skills (comma separated)</label>
        <textarea value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="e.g. Haircut, Coloring, Styling"
          rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : (initial ? 'Update' : 'Add Staff')}
        </button>
      </div>
    </form>
  );
}

export default function MyStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, staff: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/staff');
      setStaff(r.data.data.staff);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/owner/staff/${confirm.id}`);
      toast.success('Staff removed');
      fetch();
    } catch { toast.error('Failed to remove staff'); }
    finally { setDeleting(false); setConfirm({ open: false, id: null }); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-semibold text-gray-900">{v}</span> },
    { key: 'role', label: 'Role', render: (v) => v || '—' },
    { key: 'experience', label: 'Experience', render: (v) => v ? `${v} years` : '—' },
    { key: 'skills', label: 'Skills', render: (v) => (
      <div className="flex flex-wrap gap-1">
        {(v || []).map((s, i) => <span key={i} className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">{s}</span>)}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Staff</h2>
          <p className="text-sm text-gray-400">Manage your salon's team members</p>
        </div>
        <button onClick={() => setModal({ open: true, staff: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-colors">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <DataTable columns={columns} data={staff} loading={loading}
        actions={(row) => (
          <>
            <button onClick={() => setModal({ open: true, staff: row })}
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

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, staff: null })}
        title={modal.staff ? 'Edit Staff Member' : 'Add Staff Member'} size="md">
        <StaffForm initial={modal.staff}
          onSave={() => { setModal({ open: false, staff: null }); fetch(); }}
          onClose={() => setModal({ open: false, staff: null })} />
      </Modal>

      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} loading={deleting}
        title="Remove Staff" message="Are you sure you want to remove this staff member?"
        confirmText="Remove" />
    </div>
  );
}
