import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SuperSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || '', phonenumber: user?.phonenumber || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/update-account', form);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-8 mt-2">
        <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
          Admin Settings
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Manage your platform administrator account credentials</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
        <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-8 flex items-center gap-2">
          Administrator Profile
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h3>
        <div className="flex items-center gap-6 mb-10">
          <div className="w-20 h-20 rounded-[24px] bg-[#1a1a1a] flex items-center justify-center text-[#D4AF37] text-3xl font-black shadow-xl shadow-black/10 border border-white/5">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-serif font-black text-[#1a1a1a]">{user?.fullName}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{user?.email}</p>
            <span className="inline-flex mt-3 text-[9px] bg-[#D4AF37]/10 text-[#D4AF37] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <form onSubmit={handleProfile} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Full Name</label>
              <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Phone Number</label>
              <input value={form.phonenumber} onChange={e => setForm(p => ({ ...p, phonenumber: e.target.value }))}
                className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 bg-gray-50/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">Email Address (Locked)</label>
            <input value={user?.email} readOnly className="w-full px-4 py-3 border-none rounded-2xl text-sm font-bold bg-gray-100/50 text-gray-400 cursor-not-allowed" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-[#1a1a1a] hover:bg-black text-white px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/10 transition-all disabled:opacity-60 hover:scale-[1.02]">
            {saving ? 'Saving...' : 'Save Account Settings'}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-[#1a1a1a] rounded-[32px] p-8 shadow-2xl shadow-black/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-[0.05] rounded-full blur-3xl -mr-16 -mt-16"></div>
        <h4 className="font-serif font-black text-[#D4AF37] text-lg mb-4 relative z-10 flex items-center gap-2 uppercase tracking-tight">
          System Information
          <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
        </h4>
        <div className="space-y-3 relative z-10">
          <p className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
            Application Layer <span className="text-white">SalonNow Global Admin</span>
          </p>
          <p className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
            Auth Authority <span className="text-white capitalize">{user?.role?.replace('_', ' ')}</span>
          </p>
          <p className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            API Environment <span className="text-[#D4AF37] lowercase">production</span>
          </p>
        </div>
      </div>
    </div>
  );
}
