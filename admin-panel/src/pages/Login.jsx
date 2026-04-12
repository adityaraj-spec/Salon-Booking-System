import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Scissors, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate(user.role === 'super_admin' ? '/super-admin/dashboard' : '/owner/dashboard');
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a1a1a] rounded-full mb-4 shadow-xl shadow-black/10 border-2 border-[#D4AF37]">
            <Scissors size={28} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl font-serif font-black text-[#1a1a1a] tracking-wide">Salon<span className="text-[#D4AF37]">Now</span></h1>
          <p className="text-[#D4AF37] font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Admin Panel &mdash; Authorized Access Only</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@salonnow.com"
                className="w-full px-4 py-3 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all bg-gray-50 font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all bg-gray-50 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] hover:bg-black text-white py-4 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-60 mt-4"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Access restricted to administrators and salon owners only.
          </p>
        </div>
      </div>
    </div>
  );
}
