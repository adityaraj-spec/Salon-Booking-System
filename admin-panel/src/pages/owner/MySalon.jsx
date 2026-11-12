import { useState, useEffect } from 'react';
import { ImagePlus, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { FormSkeleton } from '../../components/UI/Skeleton';


export default function MySalon() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [transformations, setTransformations] = useState([]);
  const [transformationGallery, setTransformationGallery] = useState([]);
  const [transformationFiles, setTransformationFiles] = useState([]);
  const [transformationPreviews, setTransformationPreviews] = useState([]);

  useEffect(() => {
    api.get('/owner/salon')
      .then(r => {
        const s = r.data.data;
        setSalon(s);
        setTransformations(s.beforeAfterPhotos || []);
        setTransformationGallery(s.transformationGallery || []);
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

  const handlePortfolioFiles = (event) => {
    const files = Array.from(event.target.files || []);
    const remaining = Math.max(0, 10 - transformationGallery.length - transformationFiles.length);
    const accepted = files.slice(0, remaining);
    setTransformationFiles((current) => [...current, ...accepted]);
    setTransformationPreviews((current) => [...current, ...accepted.map((file) => URL.createObjectURL(file))]);
    event.target.value = '';
  };

  const removePortfolioFile = (index) => {
    URL.revokeObjectURL(transformationPreviews[index]);
    setTransformationFiles((files) => files.filter((_, i) => i !== index));
    setTransformationPreviews((urls) => urls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      newImages.forEach(f => fd.append('images', f));
      fd.append('beforeAfterPhotos', JSON.stringify(transformations.map(({ _id }) => ({ _id }))));
      fd.append('transformationGallery', JSON.stringify(transformationGallery));
      transformationFiles.forEach((file) => fd.append('transformationPhotos', file));
      const response = await api.put('/owner/salon', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSalon(response.data.data);
      setTransformations(response.data.data.beforeAfterPhotos || []);
      setTransformationGallery(response.data.data.transformationGallery || []);
      toast.success('Salon updated successfully!');
      setNewImages([]);
      setPreviews([]);
      transformationPreviews.forEach(URL.revokeObjectURL);
      setTransformationFiles([]);
      setTransformationPreviews([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update salon');
    } finally { setSaving(false); }
  };

  if (loading) return <FormSkeleton fields={6} />;
  if (!salon) return <div className="text-center py-12 text-gray-400">No salon found. Please contact the administrator.</div>;

  const F = ({ label, k, type = 'text', required, placeholder, colSpan = '' }) => (
    <div className={colSpan}>
      <label className="block text-[11px] font-bold text-gray-500 mb-2 pl-1">{label}</label>
      <input type={type} value={form[k] || ''} onChange={e => set(k, e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="mb-8 mt-2">
        <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
          My Salon
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h2>
        <p className="text-xs font-medium text-gray-500 mt-2">Update your salon information. Changes are reflected on the main website immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-3.5 sm:p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 flex items-center gap-2 tracking-tight">
            Basic Information
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Salon Name *" k="name" required />
            <F label="Contact Number" k="contactNumber" type="tel" />
            <F label="City *" k="city" required />
            <F label="State" k="state" />
            <F label="Pincode" k="pincode" />
            <F label="Total Seats" k="totalSeats" type="number" />
          </div>
          <div className="mt-6">
            <label className="block text-[11px] font-bold text-gray-500 mb-2 pl-1">Address</label>
            <input value={form.address || ''} onChange={e => set('address', e.target.value)}
              className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all" />
          </div>
          <div className="mt-6">
            <label className="block text-[11px] font-bold text-gray-500 mb-2 pl-1">Description</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Describe your salon..."
              className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 resize-none transition-all" />
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-3.5 sm:p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 flex items-center gap-2 tracking-tight">
            Working Hours
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Opening Time" k="openingHours" placeholder="09:00 AM" />
            <F label="Closing Time" k="closingHours" placeholder="09:00 PM" />
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-3.5 sm:p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 flex items-center gap-2 tracking-tight">
            Gallery Images
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
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
            <div className="flex flex-wrap gap-4 mb-6 pt-6 border-t border-gray-50">
              {previews.map((p, i) => (
                <div key={i} className="relative group">
                  <img src={p} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-xl shadow-black/5" />
                  <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg">NEW</span>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer bg-gray-50/50 hover:bg-[#D4AF37]/5 border-2 border-dashed border-gray-100 hover:border-[#D4AF37]/30 rounded-[24px] px-8 py-6 transition-all w-fit group">
            <ImagePlus size={20} className="text-gray-400 group-hover:text-[#D4AF37] transition-colors" />
            <span className="text-xs font-bold text-gray-400 group-hover:text-[#1a1a1a] transition-colors">Upload New Photos</span>
            <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
          </label>
        </div>

        {/* Transformation gallery */}
        <section className="bg-white rounded-[24px] sm:rounded-[32px] border border-gray-100 p-3.5 sm:p-5 md:p-8 shadow-sm space-y-5">
          <div><h3 className="text-base sm:text-lg font-semibold text-[#1a1a1a]">Transformation Gallery</h3><p className="text-xs sm:text-sm text-gray-600 mt-1">Upload work transformations and style showcases. Photos appear in your public salon gallery.</p></div>
          {transformationGallery.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{transformationGallery.map((url, index) => <article key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl shadow-sm"><img src={url} alt={`Transformation ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setTransformationGallery((current) => current.filter((_, i) => i !== index))} aria-label={`Remove transformation photo ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-gray-700 shadow hover:text-red-600"><Trash2 size={15} /></button></article>)}</div>}
          {transformations.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">{transformations.map((photo, index) => <article key={photo._id || index} className="relative grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-gray-100"><figure className="relative aspect-[4/3]"><img src={photo.beforeUrl} alt={`Before transformation ${index + 1}`} className="h-full w-full object-cover" /><figcaption className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">Before</figcaption></figure><figure className="relative aspect-[4/3]"><img src={photo.afterUrl} alt={`After transformation ${index + 1}`} className="h-full w-full object-cover" /><figcaption className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">After</figcaption></figure><button type="button" onClick={() => setTransformations((current) => current.filter((_, i) => i !== index))} aria-label={`Remove existing transformation ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-gray-700 shadow hover:text-red-600"><Trash2 size={15} /></button></article>)}</div>}
          {transformationGallery.length + transformations.length === 0 && <p className="text-sm text-gray-500">No transformation photos yet.</p>}
          <p className="text-xs font-medium text-gray-700">Photos ({transformationGallery.length + transformationFiles.length}/10)</p>
          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer hover:border-[#D4AF37]"><ImagePlus size={17} /> Add Transformation Photos<input type="file" accept="image/*" multiple className="sr-only" onChange={handlePortfolioFiles} /></label>
          {transformationPreviews.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{transformationPreviews.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg shadow-sm"><img src={url} alt={`New transformation preview ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removePortfolioFile(index)} aria-label={`Remove new transformation ${index + 1}`} className="absolute top-1 right-1 rounded-full bg-black/65 p-1.5 text-white"><X size={13} /></button></div>)}</div>}
        </section>
        {/* Submit */}
        <button type="submit" disabled={saving}
          className="inline-flex items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-black text-white px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl shadow-black/10 transition-all disabled:opacity-60 hover:scale-[1.02]">
          <Save size={18} className="text-[#D4AF37]" />
          {saving ? 'Saving Changes...' : 'Save Salon Details'}
        </button>
      </form>
    </div>
  );
}
