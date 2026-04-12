export default function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20',
    orange: 'bg-amber-50 text-amber-600 border-amber-100',
    green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-[#1a1a1a] text-white border-gray-800',
    red:    'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-serif font-black text-[#1a1a1a]">{value}</p>
      {sub && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{sub}</p>}
    </div>
  );
}
