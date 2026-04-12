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
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-400">Manage your admin account</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-5">Admin Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.fullName}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="inline-flex mt-1 text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
              <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
              <input value={form.phonenumber} onChange={e => setForm(p => ({ ...p, phonenumber: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email (read-only)</label>
            <input value={user?.email} readOnly className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <h4 className="font-bold text-orange-800 mb-1">Platform Info</h4>
        <div className="space-y-1 text-sm text-orange-700">
          <p>App: <span className="font-semibold">SalonNow Admin Panel</span></p>
          <p>API: <span className="font-semibold">{import.meta.env.VITE_API_URL}</span></p>
          <p>Role: <span className="font-semibold capitalize">{user?.role?.replace('_', ' ')}</span></p>
        </div>
      </div>
    </div>
  );
}
