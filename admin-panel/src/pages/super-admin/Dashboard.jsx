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
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected:  'bg-gray-100 text-gray-600',
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyBookings || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Bookings (Last 7 Days)</h3>
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
      </div>

      {/* Recent Bookings + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Recent Bookings</h3>
            <button onClick={() => navigate('/super-admin/bookings')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {(recentBookings || []).length === 0 && <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>}
            {(recentBookings || []).map(b => (
              <div key={b._id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.customer?.fullName || 'Guest'}</p>
                  <p className="text-xs text-gray-400">{b.salon?.name} • {b.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {b.totalAmount && <span className="text-sm font-bold text-gray-900">₹{b.totalAmount}</span>}
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_BADGE[b.status]}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Salon', to: '/super-admin/salons', icon: Store },
              { label: 'Add New Service', to: '/super-admin/services', icon: BarChart2 },
              { label: 'View All Bookings', to: '/super-admin/bookings', icon: Calendar },
              { label: 'Manage Owners', to: '/super-admin/owners', icon: Users },
            ].map(({ label, to, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-left transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Icon size={15} className="text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">{label}</span>
                <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
