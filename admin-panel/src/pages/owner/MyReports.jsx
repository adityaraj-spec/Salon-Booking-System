import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ReportSkeleton } from '../../components/UI/Skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

export default function MyReports() {
  const [revenue, setRevenue] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const fetch = async (isInitial = false) => {
    if (isInitial) setInitLoading(true);
    else setLoading(true);
    try {
      const r = await api.get('/owner/reports', { params: { from, to } });
      setRevenue(r.data.data.revenue || []);
    } catch { toast.error('Failed to load reports'); }
    finally { 
      setLoading(false); 
      setInitLoading(false);
    }
  };

  useEffect(() => { fetch(true); }, []);

  const totalRevenue = revenue.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalBookings = revenue.reduce((sum, r) => sum + (r.count || 0), 0);

  if (initLoading) return <ReportSkeleton />;

  return (
    <div className="space-y-6">
      <div className="mb-8 mt-2">
        <h2 className="text-2xl font-serif font-black text-[#1a1a1a] flex items-center gap-2">
          Financial Reports
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Historical financial and booking performance for your salon</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm flex flex-wrap items-end gap-6 shadow-xl shadow-black/5">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-gray-50/50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-gray-50/50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 transition-all" />
        </div>
        <button onClick={fetch} disabled={loading}
          className="bg-[#1a1a1a] hover:bg-black text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-60">
          {loading ? 'Processing...' : 'Generate Report'}
        </button>
        <button onClick={() => { setFrom(''); setTo(''); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors py-3.5 px-4 mb-0.5">Clear Filters</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm group hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Total Net Revenue</p>
          <p className="text-4xl font-serif font-black text-[#1a1a1a]">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm group hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Completed Bookings</p>
          <p className="text-4xl font-serif font-black text-[#D4AF37]">{totalBookings}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
        <h3 className="font-serif font-black text-[#1a1a1a] text-lg mb-8 flex items-center gap-2">
          Revenue Growth Trend
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
        </h3>
        {revenue.length === 0
          ? <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center py-20">No data for selected period</p>
          : <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8f8f8" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} tickFormatter={v => `₹${v}`} width={80} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={4} dot={{ r: 6, fill: '#D4AF37', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Table */}
      {revenue.length > 0 && (
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-50">
              <tr>
                {['Report Date', 'Booking Count', 'Total Revenue'].map(h => (
                  <th key={h} className="text-left px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {revenue.map(r => (
                <tr key={r._id} className="hover:bg-gray-50/50 transition-all">
                  <td className="px-8 py-4 font-bold text-gray-600">{r._id}</td>
                  <td className="px-8 py-4 font-black font-serif text-[#1a1a1a]">{r.count} Bookings</td>
                  <td className="px-8 py-4 font-black font-serif text-[#D4AF37] text-base">₹{r.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
