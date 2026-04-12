import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

export default function SuperReports() {
  const [revenue, setRevenue] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/reports/revenue', { params: { from, to } });
      setRevenue(r.data.data.revenue || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalBookings = revenue.reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Revenue Reports</h2>
        <p className="text-sm text-gray-400">Platform-wide financial overview</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <button onClick={fetch} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {loading ? 'Loading...' : 'Apply Filter'}
        </button>
        <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Clear</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Bookings</p>
          <p className="text-3xl font-bold text-blue-600">{totalBookings}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Revenue Over Time</h3>
        {revenue.length === 0
          ? <p className="text-sm text-gray-400 text-center py-12">No data for selected period</p>
          : <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} width={65} />
                <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Table */}
      {revenue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Bookings', 'Revenue'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {revenue.map(r => (
                <tr key={r._id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-700">{r._id}</td>
                  <td className="px-5 py-3 font-bold text-blue-600">{r.count}</td>
                  <td className="px-5 py-3 font-bold text-green-600">₹{r.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
