export default function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20',
    orange: 'bg-amber-50 text-amber-600 border-amber-100',
    green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red:    'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-4 md:p-6 shadow-sm hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center border shadow-sm ${colors[color]}`}>
          <Icon size={18} className="shrink-0" />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-serif font-black text-[#1a1a1a]">{value}</p>
      {sub && <p className="text-xs font-medium text-gray-400 mt-1.5 md:mt-2">{sub}</p>}
    </div>
  );
}
