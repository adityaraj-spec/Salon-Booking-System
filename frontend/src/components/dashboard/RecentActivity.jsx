import React from 'react';
import { 
  Zap, 
  Calendar, 
  XCircle, 
  Clock,
  User,
  ArrowRight
} from "lucide-react";

export const RecentActivity = ({ data, loading }) => {
  if (loading) return (
    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm animate-pulse">
      <div className="h-8 bg-gray-100 w-1/3 mb-8 rounded-lg"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 bg-gray-50 rounded-2xl w-full"></div>
        ))}
      </div>
    </div>
  );

  const getActionStyles = (action) => {
    if (action.includes("Cancelation")) return "bg-red-50 text-red-500 border-red-100";
    if (action.includes("Booked")) return "bg-emerald-50 text-emerald-500 border-emerald-100";
    return "bg-blue-50 text-blue-500 border-blue-100";
  };

  const getActionIcon = (action) => {
    if (action.includes("Cancelation")) return <XCircle size={14} />;
    if (action.includes("Booked")) return <Calendar size={14} />;
    return <Zap size={14} />;
  };

  return (
    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-serif font-black text-gray-900">Live Activity</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Now</span>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
        {data.length === 0 ? (
           <div className="text-center py-20">
              <Calendar className="mx-auto text-gray-200 mb-4" size={40} />
              <p className="text-gray-400 font-medium italic">No recent activity detected.</p>
           </div>
        ) : (
          data.map((item, idx) => (
            <div key={item._id || idx} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
              <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${getActionStyles(item.action)}`}>
                    {getActionIcon(item.action)}
                 </div>
                 <div>
                    <p className="text-sm font-bold text-gray-900">
                      <span className="text-[#D4AF37]">{item.customer}</span> {item.action}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={10} />
                        {item.slot}
                      </p>
                    </div>
                 </div>
              </div>
              <button className="p-2 text-gray-300 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                 <ArrowRight size={18} />
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Logs: {data.length}</p>
         <button className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline">Clear Feed</button>
      </div>
    </div>
  );
};
