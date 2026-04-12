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
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Your Salon</p>
            <h2 className="text-2xl font-bold">{salon.name}</h2>
            <p className="text-blue-200 text-sm mt-0.5">{salon.city}{salon.state ? `, ${salon.state}` : ''}</p>
          </div>
          <button onClick={() => navigate('/owner/salon')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            Edit Salon <ArrowRight size={14} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Bookings This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyBookings || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Recent Bookings</h3>
            <button onClick={() => navigate('/owner/bookings')} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
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
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Service', to: '/owner/services', color: 'blue' },
            { label: 'View Bookings', to: '/owner/bookings', color: 'green' },
            { label: 'Manage Staff', to: '/owner/staff', color: 'purple' },
            { label: 'View Reports', to: '/owner/reports', color: 'orange' },
          ].map(({ label, to, color }) => (
            <button key={to} onClick={() => navigate(to)}
              className={`p-4 rounded-xl border-2 border-${color}-100 bg-${color}-50 hover:bg-${color}-100 text-${color}-700 font-semibold text-sm transition-colors text-center`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
