import React from 'react';
import { 
  CalendarCheck, 
  CheckCircle, 
  Clock, 
  XSquare,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export const DashboardStats = ({ stats, loading }) => {
  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
      ))}
    </div>
  );

  const cards = [
    { 
      label: "Total Today", 
      value: stats.total || 0, 
      icon: <CalendarCheck size={20} />, 
      color: "blue",
      bgColor: "bg-blue-50 text-blue-600" 
    },
    { 
      label: "Completed", 
      value: stats.completed || 0, 
      icon: <CheckCircle size={20} />, 
      color: "emerald",
      bgColor: "bg-emerald-50 text-emerald-600" 
    },
    { 
      label: "Pending", 
      value: stats.pending || 0, 
      icon: <Clock size={20} />, 
      color: "amber",
      bgColor: "bg-amber-50 text-amber-600" 
    },
    { 
      label: "No-Shows", 
      value: stats.noShows || 0, 
      icon: <XSquare size={20} />, 
      color: "red",
      bgColor: "bg-red-50 text-red-600" 
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${card.bgColor} group-hover:scale-110 transition-transform`}>
              {React.cloneElement(card.icon, { size: 24 })}
            </div>
            <div className="h-1.5 w-8 bg-gray-50 rounded-full overflow-hidden">
               <div className={`h-full ${card.bgColor.replace('50', '500')} rounded-full`} style={{ width: '60%' }}></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
            <h3 className="text-3xl font-serif font-black text-gray-900">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};
