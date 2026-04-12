import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

/** Inline price editor — double-click to edit */
function InlinePrice({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const start = () => { setEditing(true); setTimeout(() => inputRef.current?.select(), 50); };
  const cancel = () => { setEditing(false); setVal(value); };
  const save = async () => {
    const num = Number(val);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid price'); return; }
    setSaving(true);
    await onSave(num);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-[14px] shadow-lg border border-[#D4AF37]/20">
        <span className="text-[#D4AF37] text-xs font-black ml-2">₹</span>
        <input ref={inputRef} type="number" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="w-20 px-2 py-1.5 border-none rounded-lg text-sm font-black focus:outline-none bg-gray-50/50" />
        <button onClick={save} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
          <Check size={14} />
        </button>
        <button onClick={cancel} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div onDoubleClick={start}
      title="Double-click to edit price"
      className="flex items-center gap-2 cursor-pointer group hover:bg-[#D4AF37]/5 px-3 py-1.5 rounded-full transition-all border border-transparent hover:border-[#D4AF37]/10 w-fit">
      <span className="text-sm font-black font-serif text-[#1a1a1a]">₹{value}</span>
      <Pencil size={11} className="text-gray-300 group-hover:text-[#D4AF37] transition-colors" />
    </div>
  );
}

function ServiceForm({ initial, salons, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', category: initial?.category || '',
    price: initial?.price || '', duration: initial?.duration || '',
    description: initial?.description || '', salonId: initial?.salon?._id || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?._id) {
        await api.put(`/admin/services/${initial._id}`, form);
        toast.success('Service updated');
      } else {
        await api.post('/admin/services', form);
        toast.success('Service created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[['name','Service Name *',true,'text'],['category','Category','false','text'],
          ['price','Price (₹)',false,'number'],['duration','Duration (mins)',false,'number']].map(([k,label,req,type]) => (
          <div key={k}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">{label}</label>
            <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required={req === true}
              className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all font-sans" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Target Salon *</label>
        <select value={form.salonId} onChange={e => set('salonId', e.target.value)} required
          className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all">
          <option value="">Select a salon</option>
          {salons.map(s => <option key={s._id} value={s._id}>{s.name} – {s.city}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 resize-none transition-all" />
      </div>
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 bg-gray-50 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-[#1a1a1a] hover:bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-60">
          {saving ? 'Saving...' : (initial ? 'Update Service' : 'Create Global Service')}
        </button>
      </div>
    </form>
  );
}

export default function SuperServices() {
  const [services, setServices] = useState([]);
  const [salons, setSalons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, service: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/services', { params: { page, limit, search } });
      setServices(r.data.data.services);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    api.get('/admin/salons', { params: { limit: 100 } }).then(r => setSalons(r.data.data.salons)).catch(() => {});
  }, []);

  const handlePriceSave = async (id, price) => {
    try {
      await api.put(`/admin/services/${id}`, { price });
      toast.success('Price updated');
      fetch();
    } catch { toast.error('Failed to update price'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/services/${confirm.id}`);
      toast.success('Service deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); setConfirm({ open: false, id: null }); }
  };

  const columns = [
    { key: 'name', label: 'Service Name', render: (v) => <span className="font-bold text-[#1a1a1a]">{v}</span> },
    { key: 'salon', label: 'Salon', render: (v) => <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v?.name || '—'}</span> },
    { key: 'category', label: 'Category', render: (v) => v
      ? <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{v}</span>
      : '—' },
    { key: 'price', label: 'Price', render: (v, row) => (
      <InlinePrice value={v} onSave={(newPrice) => handlePriceSave(row._id, newPrice)} />
    )},
    { key: 'duration', label: 'Duration', render: (v) => v ? <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v} min</span> : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-6 mb-8 mt-2">
        <div>
          <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
            Global Services
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Manage standard services and prices across all salons</p>
        </div>
        <button onClick={() => setModal({ open: true, service: null })}
          className="flex items-center gap-3 bg-[#1a1a1a] hover:bg-black text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-black/10 hover:scale-[1.02]">
          <Plus size={16} className="text-[#D4AF37]" /> Add Global Service
        </button>
      </div>

      <DataTable columns={columns} data={services} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search services..."
        actions={(row) => (
          <>
            <button onClick={() => setModal({ open: true, service: row })}
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

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, service: null })}
        title={modal.service ? 'Edit Service' : 'Add New Service'} size="md">
        <ServiceForm initial={modal.service} salons={salons}
          onSave={() => { setModal({ open: false, service: null }); fetch(); }}
          onClose={() => setModal({ open: false, service: null })} />
      </Modal>

      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Service" message="This will permanently remove this service from the platform."
        confirmText="Delete Service" />
    </div>
  );
}
