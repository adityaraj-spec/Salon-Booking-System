import { useState, useEffect } from 'react';
import {
  Banknote, Scissors, Store, Users, Calendar,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/UI/StatCard';
import { DashboardSkeleton } from '../../components/UI/Skeleton';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-800 font-semibold',
  confirmed: 'bg-[#D4AF37]/15 text-[#997917] font-semibold',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold',
  cancelled: 'bg-red-100 text-red-700 font-semibold',
  rejected:  'bg-gray-100 text-gray-700 font-semibold',
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

  if (loading) return <DashboardSkeleton />;

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
  const hasChartData = dailyBookings && dailyBookings.length > 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={Banknote} color="green" sub="From completed bookings" />
        <StatCard label="Total Bookings" value={stats?.totalBookings || 0} icon={Calendar} color="blue" sub="All time" />
        <StatCard label="Active Salons" value={stats?.totalSalons || 0} icon={Store} color="orange" sub="Registered on platform" />
        <StatCard label="Total Customers" value={stats?.totalCustomers || 0} icon={Users} color="purple" sub="Registered users" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 md:mb-8">
            Global Revenue
          </h3>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} width={45} tickFormatter={v => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={4} dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D4AF37] flex items-center justify-center mb-2">
                <Banknote size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-800">No Revenue Data Yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Revenue chart will populate as appointments are completed.</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 md:mb-8">
            Booking Volume
          </h3>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                  cursor={{ fill: '#fcfcfc' }}
                />
                <Bar dataKey="count" fill="#1a1a1a" radius={[6,6,0,0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Calendar size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-800">No Booking Volume Data</p>
              <p className="text-xs text-gray-400 mt-0.5">Daily volume trends will appear here once bookings occur.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-5 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif font-black text-[#1a1a1a] text-lg">
              Platform Feed
            </h3>
            <button onClick={() => navigate('/super-admin/bookings')} className="text-xs text-[#D4AF37] hover:text-[#B8962E] font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="space-y-1">
            {(recentBookings || []).length === 0 && <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>}
            {(recentBookings || []).map(b => (
              <div key={b._id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all px-2.5 rounded-xl">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-bold text-[#1a1a1a] truncate">{b.customer?.fullName || 'Guest'}</p>
                  <p className="text-xs font-normal text-gray-400 mt-0.5 truncate">{b.salon?.name} • {b.date}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-center">
                  {b.totalAmount && <span className="font-serif font-bold text-[#1a1a1a] text-sm md:text-base leading-none">₹{b.totalAmount}</span>}
                  <span className={`text-xs px-2.5 py-1 rounded-full leading-none capitalize ${STATUS_BADGE[b.status]}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Command */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-6 md:p-8 shadow-sm text-gray-900">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6">
            Command Actions
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Add New Salon', to: '/super-admin/salons', icon: Store },
              { label: 'Add New Service', to: '/super-admin/services', icon: Scissors },
              { label: 'View All Bookings', to: '/super-admin/bookings', icon: Calendar },
              { label: 'Manage Owners', to: '/super-admin/owners', icon: Users },
            ].map(({ label, to, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50/70 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 border border-gray-100 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#D4AF37] transition-colors">
                  <Icon size={17} className="text-[#D4AF37] group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#1a1a1a] transition-colors">{label}</span>
                <ArrowRight size={14} className="ml-auto text-gray-400 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
