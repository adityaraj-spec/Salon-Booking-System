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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[['name','Name *',true,'text'],['role','Role / Title',false,'text'],
          ['experience','Experience (Years)',false,'number']].map(([k,label,req,type]) => (
          <div key={k}>
            <label className="block text-[11px] font-bold text-gray-500 mb-2 pl-1">{label}</label>
            <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required={req === true}
              className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 mb-2 pl-1">Skills (comma separated)</label>
        <textarea value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="e.g. Haircut, Coloring, Styling"
          rows={2} className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 resize-none" />
      </div>
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-gray-50 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-[#1a1a1a] hover:bg-black text-white rounded-full text-xs font-bold transition-all shadow-xl shadow-black/10 disabled:opacity-60">
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
    { key: 'name', label: 'Name', render: (v) => <span className="font-bold text-[#1a1a1a]">{v}</span> },
    { key: 'role', label: 'Role', render: (v) => <span className="text-xs font-medium text-gray-500">{v || '—'}</span> },
    { key: 'experience', label: 'Experience', render: (v) => v ? <span className="font-serif font-black text-[#1a1a1a]">{v} years</span> : '—' },
    { key: 'skills', label: 'Skills', render: (v) => (
      <div className="flex flex-wrap gap-1.5">
        {(v || []).map((s, i) => <span key={i} className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-3 py-1 rounded-full">{s}</span>)}
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            My Staff
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-xs font-medium text-gray-500 mt-2">Manage your salon's team members</p>
        </div>
        <button onClick={() => setModal({ open: true, staff: null })}
          className="flex items-center gap-3 bg-[#1a1a1a] hover:bg-black text-white px-8 py-4 rounded-full text-xs font-bold transition-all shadow-xl shadow-black/10 hover:scale-[1.02]">
          <Plus size={16} className="text-[#D4AF37]" /> Add Staff
        </button>
      </div>

      <DataTable columns={columns} data={staff} loading={loading}
        actions={(row) => (
          <>
            <button onClick={() => setModal({ open: true, staff: row })}
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
