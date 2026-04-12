import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Scissors, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/UI/StatCard';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-[#D4AF37]/10 text-[#D4AF37]',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  rejected:  'bg-gray-100 text-gray-600',
};

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/owner/dashboard')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;

  const { salon, stats, recentBookings, dailyBookings } = data || {};

  return (
    <div className="space-y-6">
      {/* Salon banner */}
      {salon && (
        <div className="bg-[#1a1a1a] rounded-[32px] p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl shadow-black/10 border border-[#D4AF37]/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-[0.03] rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Authenticated Salon</p>
            <h2 className="text-3xl font-serif font-black">{salon.name}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {salon.city}{salon.state ? `, ${salon.state}` : ''}
            </p>
          </div>
          <button onClick={() => navigate('/owner/salon')}
            className="relative z-10 flex items-center gap-3 bg-[#D4AF37] hover:bg-[#B8962E] text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02]">
            Salon Settings <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Monthly Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard label="Total Bookings" value={stats?.totalBookings || 0} icon={Calendar} color="blue" />
        <StatCard label="Active Services" value={stats?.totalServices || 0} icon={Scissors} color="orange" />
        <StatCard label="Staff Members" value={stats?.totalStaff || 0} icon={Users} color="purple" />
      </div>

      {/* Chart + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 flex items-center gap-2">
            Weekly Activity
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyBookings || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                cursor={{ fill: '#fcfcfc' }}
              />
              <Bar dataKey="count" fill="#D4AF37" radius={[6,6,0,0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif font-black text-[#1a1a1a] text-lg flex items-center gap-2">
              Recent Bookings
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
            </h3>
            <button onClick={() => navigate('/owner/bookings')} className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#B8962E] transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {(recentBookings || []).length === 0 && <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>}
            {(recentBookings || []).map(b => (
              <div key={b._id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.customer?.fullName || 'Guest'}</p>
                  <p className="text-xs text-gray-400">{b.date} {b.time ? `@ ${b.time}` : ''}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_BADGE[b.status]}`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
        <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-6 flex items-center gap-2">
          Management
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Add Service', to: '/owner/services', icon: Scissors },
            { label: 'All Bookings', to: '/owner/bookings', icon: Calendar },
            { label: 'Manage Staff', to: '/owner/staff', icon: Users },
            { label: 'Reports', to: '/owner/reports', icon: TrendingUp },
          ].map(({ label, to, icon: Icon }) => (
            <button key={to} onClick={() => navigate(to)}
              className="flex flex-col items-center gap-3 p-6 rounded-3xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:border-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#D4AF37] shadow-sm group-hover:bg-[#1a1a1a] transition-all">
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-[#1a1a1a]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
