import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Scissors,
  Zap,
  Users,
  Grid,
  List
} from "lucide-react";

export const VisualCalendar = ({ bookings, staff, onReschedule }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [draggedBooking, setDraggedBooking] = useState(null);

  // Time slots from 9 AM to 8 PM
  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", 
    "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"
  ];

  const getBookingForSlot = (staffName, time) => {
    return bookings.find(b => b.staff === staffName && b.time === time && b.date === selectedDate);
  };

  const handleDragStart = (booking) => {
    setDraggedBooking(booking);
  };

  const handleDrop = (staffName, time) => {
    if (draggedBooking && onReschedule) {
      onReschedule(draggedBooking._id, { staff: staffName, time: time });
      setDraggedBooking(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px] hover:shadow-xl transition-all">
      {/* Calendar Header */}
      <div className="bg-[#1a1a1a] p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-[#D4AF37]">
            <Calendar size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-serif font-black text-white mb-1">Master Schedule</h3>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} className="text-[#D4AF37]" />
              Visual Time Slots & Staff Grid
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
          <button className="p-2 text-white/60 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
          <div className="px-6 py-2 bg-[#D4AF37] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#D4AF37]/20">
            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button className="p-2 text-white/60 hover:text-white transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Grid Header (Staff List) */}
      <div className="flex bg-gray-50/80 border-b border-gray-100 backdrop-blur-md sticky top-0 z-20">
        <div className="w-24 border-r border-gray-100 p-4 flex items-center justify-center bg-gray-50/50">
           <Zap size={18} className="text-[#D4AF37]" />
        </div>
        {staff.map(m => (
          <div key={m._id} className="flex-1 min-w-[200px] p-6 border-r border-gray-100 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: m.color || '#D4AF37' }}>
              {m.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-[#D4AF37] transition-colors">{m.name}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="min-w-max">
          {timeSlots.map(time => (
            <div key={time} className="flex border-b border-gray-50/50 hover:bg-gray-50/30 transition-all">
              {/* Time Label */}
              <div className="w-24 border-r border-gray-100 p-6 flex items-center justify-center bg-gray-50/20">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{time}</span>
              </div>
              
              {/* Staff Slots */}
              {staff.map(m => {
                const booking = getBookingForSlot(m.name, time);
                return (
                  <div 
                    key={`${m._id}-${time}`} 
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(m.name, time)}
                    className={`flex-1 min-w-[200px] min-h-[100px] p-2 border-r border-gray-50 relative group transition-colors ${!booking ? 'hover:bg-[#D4AF37]/5' : ''}`}
                  >
                    {booking ? (
                      <div 
                        draggable
                        onDragStart={() => handleDragStart(booking)}
                        className={`w-full h-full p-4 rounded-2xl shadow-sm border-l-[6px] transition-all cursor-move group-hover:shadow-md active:scale-[0.98] active:shadow-none animate-in zoom-in-95 duration-200`}
                        style={{ 
                          backgroundColor: `${m.color}05` || '#D4AF3705',
                          borderColor: m.color || '#D4AF37',
                          color: '#1a1a1a'
                        }}
                      >
                         <div className="flex items-start justify-between mb-2">
                           <h5 className="text-xs font-bold truncate pr-6">{booking.customer?.fullName || "Guest Account"}</h5>
                           <div className="p-1.5 rounded-lg bg-white/80 shadow-sm text-gray-400 transition-colors group-hover:text-[#D4AF37]">
                             <Scissors size={10} />
                           </div>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {booking.serviceNames?.slice(0, 2).map((s, idx) => (
                               <span key={idx} className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white border border-gray-100 rounded-md">
                                 {s}
                               </span>
                            ))}
                            {booking.serviceNames?.length > 2 && <span className="text-[8px] font-black text-gray-300">+{booking.serviceNames.length - 2} more</span>}
                         </div>
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-1.5 w-1.5 bg-[#D4AF37] rounded-full animate-pulse"></div>
                         </div>
                      </div>
                    ) : (
                      <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center border-2 border-dashed border-[#D4AF37]/20 rounded-2xl transition-all">
                        <span className="text-[10px] font-black text-[#D4AF37]/40 uppercase tracking-widest">Available Slot</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Visual Legend */}
      <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Booking</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 border-2 border-dashed border-[#D4AF37]/40 rounded-full"></div>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Open Slot</span>
            </div>
         </div>
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drag an appointment block to reschedule instantly.</p>
      </div>
    </div>
  );
};
