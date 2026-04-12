import { useState, useEffect } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

export default function MySalon() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    api.get('/owner/salon')
      .then(r => {
        const s = r.data.data;
        setSalon(s);
        setForm({
          name: s.name || '', city: s.city || '', state: s.state || '',
          pincode: s.pincode || '', address: s.address || '',
          contactNumber: s.contactNumber || '', description: s.description || '',
          openingHours: s.openingHours || '', closingHours: s.closingHours || '',
          totalSeats: s.totalSeats || 6,
        });
      })
      .catch(() => toast.error('Failed to load salon details'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      newImages.forEach(f => fd.append('images', f));
      await api.put('/owner/salon', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Salon updated successfully!');
      setNewImages([]);
      setPreviews([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update salon');
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner text="Loading salon details..." />;
  if (!salon) return <div className="text-center py-12 text-gray-400">No salon found. Please contact the administrator.</div>;

  const F = ({ label, k, type = 'text', required, placeholder, colSpan = '' }) => (
    <div className={colSpan}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-gray-50 transition-all" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Salon</h2>
        <p className="text-sm text-gray-400">Update your salon information. Changes are reflected on the main website immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Salon Name *" k="name" required />
            <F label="Contact Number" k="contactNumber" type="tel" />
            <F label="City *" k="city" required />
            <F label="State" k="state" />
            <F label="Pincode" k="pincode" />
            <F label="Total Seats" k="totalSeats" type="number" />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
            <input value={form.address || ''} onChange={e => set('address', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Describe your salon..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 resize-none" />
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Working Hours</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Opening Time" k="openingHours" placeholder="09:00 AM" />
            <F label="Closing Time" k="closingHours" placeholder="09:00 PM" />
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Gallery Images</h3>
          {/* Existing */}
          {(salon.images || []).length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {salon.images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-100 shadow-sm" />
              ))}
            </div>
          )}
          {/* New previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="w-24 h-24 rounded-xl object-cover border-2 border-blue-300 shadow-sm" />
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-blue-50 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-5 py-3.5 transition-all w-fit">
            <ImagePlus size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500 font-medium">Upload New Images</span>
            <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
          </label>
        </div>

        {/* Submit */}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all disabled:opacity-60">
          <Save size={16} />
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
