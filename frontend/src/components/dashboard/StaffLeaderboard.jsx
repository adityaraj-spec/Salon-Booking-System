import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Star,
  Award,
  Crown
} from "lucide-react";

export const StaffLeaderboard = ({ data, loading }) => {
  if (loading) return (
    <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm animate-pulse">
      <div className="h-10 bg-gray-100 w-1/4 mb-10 rounded-xl"></div>
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-50 rounded-2xl w-full"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-3xl font-serif font-black text-gray-900 mb-2">Stylist Leaderboard</h3>
          <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
            <Award size={16} className="text-[#D4AF37]" />
            Elite performance for this week
          </p>
        </div>
        <div className="p-4 rounded-3xl bg-emerald-50 text-emerald-600">
           <TrendingUp size={28} />
        </div>
      </div>

      <div className="space-y-6">
        {data.length === 0 ? (
           <p className="text-gray-400 font-medium italic text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">No performance data yet.</p>
        ) : (
          data.map((staff, idx) => (
            <div key={staff.staffId} className="group relative flex items-center justify-between p-5 rounded-[28px] border border-transparent hover:border-[#D4AF37]/20 hover:bg-gray-50 transition-all cursor-pointer">
              <div className="flex items-center gap-6">
                <div className="relative">
                   <div className="w-16 h-16 rounded-[22px] bg-[#1a1a1a] flex items-center justify-center text-white border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10">
                     {staff.profilePic ? (
                       <img src={staff.profilePic} className="w-full h-full rounded-[20px] object-cover" alt={staff.name} />
                     ) : (
                       <Users size={28} />
                     )}
                   </div>
                   {idx === 0 && (
                     <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#D4AF37] text-white flex items-center justify-center shadow-lg border-2 border-white">
                        <Crown size={14} />
                     </div>
                   )}
                </div>
                <div>
                   <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#D4AF37] transition-colors">{staff.name}</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{staff.role}</p>
                </div>
              </div>
              
              <div className="text-right">
                 <p className="text-xl font-black text-gray-900 mb-1">₹{staff.revenue}</p>
                 <div className="flex items-center justify-end gap-1.5 text-xs text-[#D4AF37] font-bold">
                   <Star size={12} className="fill-[#D4AF37]" />
                   {staff.bookings} bookings
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <button className="w-full mt-10 py-5 rounded-3xl bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 hover:text-gray-900 transition-all">
        View Detailed Analytics
      </button>
    </div>
  );
};
