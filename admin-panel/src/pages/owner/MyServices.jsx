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
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">₹</span>
        <input ref={inputRef} type="number" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="w-20 px-2 py-1 border-2 border-blue-400 rounded-lg text-sm font-bold focus:outline-none" />
        <button onClick={save} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors">
          <Check size={14} />
        </button>
        <button onClick={cancel} className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div onDoubleClick={start}
      title="Double-click to edit price"
      className="flex items-center gap-1 cursor-pointer group hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors w-fit">
      <span className="text-sm font-bold text-gray-900">₹{value}</span>
      <Pencil size={11} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
    </div>
  );
}

function ServiceForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', category: initial?.category || '',
    price: initial?.price || '', duration: initial?.duration || '',
    description: initial?.description || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?._id) {
        await api.put(`/owner/services/${initial._id}`, form);
        toast.success('Service updated');
      } else {
        await api.post('/owner/services', form);
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} required={req === true}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : (initial ? 'Update' : 'Create Service')}
        </button>
      </div>
    </form>
  );
}

export default function MyServices() {
  const [services, setServices] = useState([]);
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
      const r = await api.get('/owner/services', { params: { page, limit, search } });
      setServices(r.data.data.services);
      setTotal(r.data.data.pagination.total);
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handlePriceSave = async (id, price) => {
    try {
      await api.put(`/owner/services/${id}`, { price });
      toast.success('Price updated');
      fetch();
    } catch { toast.error('Failed to update price'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/owner/services/${confirm.id}`);
      toast.success('Service deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); setConfirm({ open: false, id: null }); }
  };

  const columns = [
    { key: 'name', label: 'Service Name', render: (v) => <span className="font-semibold text-gray-900">{v}</span> },
    { key: 'category', label: 'Category', render: (v) => v
      ? <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">{v}</span>
      : '—' },
    { key: 'price', label: 'Price', render: (v, row) => (
      <InlinePrice value={v} onSave={(newPrice) => handlePriceSave(row._id, newPrice)} />
    )},
    { key: 'duration', label: 'Duration', render: (v) => v ? `${v} min` : '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Services</h2>
          <p className="text-sm text-gray-400">Double-click any price to edit inline. Changes reflect on main site immediately.</p>
        </div>
        <button onClick={() => setModal({ open: true, service: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-colors">
          <Plus size={16} /> Add Service
        </button>
      </div>

      <DataTable columns={columns} data={services} total={total} page={page} limit={limit}
        loading={loading} onPageChange={setPage} onLimitChange={setLimit} onSearch={setSearch}
        searchPlaceholder="Search services..."
        actions={(row) => (
          <>
            <button onClick={() => setModal({ open: true, service: row })}
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

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, service: null })}
        title={modal.service ? 'Edit Service' : 'Add New Service'} size="md">
        <ServiceForm initial={modal.service}
          onSave={() => { setModal({ open: false, service: null }); fetch(); }}
          onClose={() => setModal({ open: false, service: null })} />
      </Modal>

      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Service" message="This will permanently remove this service from your salon."
        confirmText="Delete Service" />
    </div>
  );
}
