import { useState, useEffect } from 'react';
import {
  BarChart2, TrendingUp, Store, Users, Calendar,
  Plus, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/UI/StatCard';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-700 font-bold uppercase tracking-widest',
  confirmed: 'bg-[#D4AF37]/10 text-[#D4AF37] font-bold uppercase tracking-widest',
  completed: 'bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest',
  cancelled: 'bg-red-100 text-red-700 font-bold uppercase tracking-widest',
  rejected:  'bg-gray-100 text-gray-600 font-bold uppercase tracking-widest',
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .catch(err => {
        console.error('Dashboard error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[32px] border border-red-100 p-12 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Store size={32} />
        </div>
        <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Access Restricted</h2>
        <p className="text-gray-500 max-w-sm mb-8">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-[#1a1a1a] text-white rounded-full font-bold text-sm hover:bg-black transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { stats, dailyBookings, recentBookings } = data || {};

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={TrendingUp} color="green" sub="From completed bookings" />
        <StatCard label="Total Bookings" value={stats?.totalBookings || 0} icon={Calendar} color="blue" sub="All time" />
        <StatCard label="Active Salons" value={stats?.totalSalons || 0} icon={Store} color="orange" sub="Registered on platform" />
        <StatCard label="Total Customers" value={stats?.totalCustomers || 0} icon={Users} color="purple" sub="Registered users" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 md:mb-8 flex items-center gap-2">
            Global Revenue
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyBookings || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} width={45} tickFormatter={v => `₹${v}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={4} dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 md:mb-8 flex items-center gap-2">
            Booking Volume
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyBookings || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} width={30} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                cursor={{ fill: '#fcfcfc' }}
              />
              <Bar dataKey="count" fill="#1a1a1a" radius={[6,6,0,0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="font-serif font-black text-[#1a1a1a] text-lg flex items-center gap-2">
              Platform Feed
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
            </h3>
            <button onClick={() => navigate('/super-admin/bookings')} className="text-[10px] text-[#D4AF37] hover:text-[#B8962E] font-black uppercase tracking-widest flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {(recentBookings || []).length === 0 && <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>}
            {(recentBookings || []).map(b => (
              <div key={b._id} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all px-2 rounded-xl">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-bold text-[#1a1a1a] truncate">{b.customer?.fullName || 'Guest'}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{b.salon?.name} • {b.date}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  {b.totalAmount && <span className="font-serif font-black text-[#1a1a1a] text-sm md:text-base">₹{b.totalAmount}</span>}
                  <span className={`text-[8px] md:text-[10px] font-black px-2.5 py-1 rounded-full ${STATUS_BADGE[b.status]}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1a1a1a] rounded-[32px] p-8 shadow-2xl shadow-black/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-[0.05] rounded-full blur-2xl -mr-16 -mt-16"></div>
          <h3 className="font-serif font-black text-white text-lg mb-8 relative z-10 flex items-center gap-2">
            Command
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <div className="space-y-3 relative z-10">
            {[
              { label: 'Add New Salon', to: '/super-admin/salons', icon: Store },
              { label: 'Add New Service', to: '/super-admin/services', icon: BarChart2 },
              { label: 'View All Bookings', to: '/super-admin/bookings', icon: Calendar },
              { label: 'Manage Owners', to: '/super-admin/owners', icon: Users },
            ].map(({ label, to, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] bg-white/5 hover:bg-[#D4AF37] text-left transition-all group"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Icon size={18} className="text-[#D4AF37] group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 group-hover:text-white transition-colors">{label}</span>
                <ArrowRight size={14} className="ml-auto text-white/20 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
