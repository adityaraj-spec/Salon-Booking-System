import React from 'react';
import { 
  Users, 
  Clock, 
  Send, 
  Plus, 
  XCircle,
  MoreVertical,
  CheckCircle,
  Calendar
} from "lucide-react";

export const WaitlistPanel = ({ data, loading, onNotify, onRemove }) => {
  if (loading) return (
    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm animate-pulse">
      <div className="h-8 bg-gray-100 w-1/2 mb-8 rounded-lg"></div>
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-50 rounded-2xl w-full"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-serif font-black text-gray-900 mb-1">Waitlist Management</h3>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} className="text-[#D4AF37]" />
            Recovery Queue
          </p>
        </div>
        <button className="p-3 bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 rounded-2xl transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[32px]">
            <Users className="mx-auto text-gray-200 mb-4" size={40} />
            <p className="text-gray-400 font-medium italic">Waitlist is currently empty.</p>
          </div>
        ) : (
          data.map((item, idx) => (
            <div key={item._id} className="group relative bg-gray-50/50 hover:bg-white p-5 rounded-[30px] border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-bold text-lg shadow-sm">
                      {item.customer?.fullName?.charAt(0)}
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-gray-900 mb-1">{item.customer?.fullName}</h4>
                      <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">{item.preferredTimeRange}</p>
                   </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${item.status === 'offered' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                   {item.status}
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[10px] font-bold text-gray-500 border border-gray-100">
                    <Calendar size={10} />
                    {item.preferredDate}
                 </div>
                 {item.preferredStaff && (
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-[10px] font-bold text-gray-500 border border-gray-100">
                      <Users size={10} />
                      {item.preferredStaff.name}
                   </div>
                 )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2">
                 <button 
                   onClick={() => onNotify(item._id)}
                   disabled={item.status === 'offered'}
                   className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${item.status === 'offered' ? 'bg-emerald-50 text-emerald-500 cursor-default' : 'bg-[#1a1a1a] text-white hover:bg-black shadow-lg shadow-black/10'}`}
                 >
                    {item.status === 'offered' ? <CheckCircle size={14} /> : <Send size={14} />}
                    {item.status === 'offered' ? "Offer Sent" : "Send Offer"}
                 </button>
                 <button 
                   onClick={() => onRemove(item._id)}
                   className="p-3 bg-white text-gray-400 hover:text-red-500 border border-gray-100 rounded-xl transition-all"
                 >
                    <XCircle size={16} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-black p-6 rounded-[32px] text-white relative overflow-hidden group border border-white/10">
         <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/20 rounded-full -mr-12 -mt-12 blur-2xl"></div>
         <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2">Pro Tip</p>
         <p className="text-xs font-medium text-gray-300 leading-relaxed group-hover:text-white transition-colors">Offering a waitlisted client an appointment within 15 minutes of a cancellation increases re-booking odds by 80%.</p>
      </div>
    </div>
  );
};
