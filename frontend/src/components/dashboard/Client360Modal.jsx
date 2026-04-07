import React from 'react';
import { 
  User, 
  Clock, 
  Scissors, 
  AlertTriangle, 
  Star,
  History,
  Info,
  Gift,
  Ban,
  X,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  Tag
} from "lucide-react";

export const Client360Modal = ({ client, isOpen, onClose }) => {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[50px] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative animate-in zoom-in-95 duration-500">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-all z-50"
        >
          <X size={24} />
        </button>

        {/* Sidebar Profile */}
        <div className="w-full md:w-80 bg-gray-50/80 p-10 flex flex-col items-center border-r border-gray-100 backdrop-blur-sm">
           <div className="w-32 h-32 rounded-[40px] bg-[#1a1a1a] flex items-center justify-center text-white border-4 border-white shadow-2xl shadow-[#D4AF37]/10 mb-6 relative group overflow-hidden">
              {client.profilePic ? (
                 <img src={client.profilePic} className="w-full h-full object-cover" alt={client.fullName} />
              ) : (
                 <User size={48} />
              )}
              <div className="absolute inset-0 bg-[#D4AF37]/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </div>
           
           <h3 className="text-2xl font-serif font-black text-gray-900 text-center mb-1">{client.fullName}</h3>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Platinum Member</p>
           
           <div className="w-full space-y-4 pt-10 border-t border-gray-100">
              <div className="flex items-center gap-4 group">
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#D4AF37] border border-gray-100 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all shadow-sm">
                    <Phone size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                    <p className="text-xs font-bold text-gray-900">{client.phonenumber || "+91 98765 43210"}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4 group">
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#D4AF37] border border-gray-100 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all shadow-sm">
                    <Mail size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{client.email || "client@salon.com"}</p>
                 </div>
              </div>
           </div>

           <div className="mt-auto w-full space-y-2">
              <button className="w-full py-4 rounded-2xl bg-[#1a1a1a] text-white flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10">
                 <Scissors size={14} /> Send Voucher
              </button>
              <button className="w-full py-4 rounded-2xl bg-white text-red-500 border border-red-50 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all">
                 <Ban size={14} /> Blacklist Client
              </button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Client Insights */}
              <div className="space-y-10">
                 <div>
                    <h4 className="text-lg font-serif font-black text-gray-900 mb-6 flex items-center gap-3">
                       <TrendingUp size={20} className="text-[#D4AF37]" />
                       Loyalty Insights
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Total Visits</p>
                          <h5 className="text-3xl font-serif font-black text-gray-900">{client.visitCount || 0}</h5>
                       </div>
                       <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">LTV</p>
                          <h5 className="text-3xl font-serif font-black text-gray-900">₹{client.totalSpent || 0}</h5>
                       </div>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-lg font-serif font-black text-gray-900 mb-6 flex items-center gap-3">
                       <Star size={20} className="text-[#D4AF37]" />
                       Preferences
                    </h4>
                    <div className="space-y-4">
                       <div className="p-6 bg-white border border-gray-100 rounded-[32px] flex items-center justify-between group hover:border-[#D4AF37]/20 transition-all">
                          <div>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                Preferred Stylist
                             </p>
                             <p className="font-bold text-gray-900">{client.preferredStylist?.name || "Maria asked for John"}</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#D4AF37] transition-transform group-hover:scale-110">
                             <User size={18} />
                          </div>
                       </div>
                       <div className={`p-6 border rounded-[32px] flex items-center justify-between group transition-all ${client.allergies ? 'bg-red-50/50 border-red-100' : 'bg-white border-gray-100'}`}>
                          <div>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                Medical/Allergies
                             </p>
                             <p className={`font-bold ${client.allergies ? 'text-red-600' : 'text-gray-900'}`}>
                                {client.allergies || "No allergies reported"}
                             </p>
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${client.allergies ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-300'}`}>
                             <AlertTriangle size={18} />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* History & Notes */}
              <div className="space-y-10">
                 <div className="bg-white border border-gray-100 rounded-[40px] p-8 hover:shadow-xl transition-all">
                    <h4 className="text-lg font-serif font-black text-gray-900 mb-6 flex items-center gap-3">
                       <Info size={20} className="text-[#D4AF37]" />
                       Administrative Notes
                    </h4>
                    <textarea 
                       className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm italic text-gray-600 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
                       rows="4"
                       placeholder="Add important details about scalp sensitivity, favorite products..."
                       defaultValue={client.notes}
                    ></textarea>
                    <button className="mt-4 px-6 py-2 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg shadow-[#D4AF37]/20 transition-all">
                       Save Note
                    </button>
                 </div>

                 <div>
                    <h4 className="text-lg font-serif font-black text-gray-900 mb-6 flex items-center gap-3">
                       <History size={20} className="text-[#D4AF37]" />
                       Purchase History
                    </h4>
                    <div className="space-y-3">
                       {client.purchaseHistory?.length > 0 ? (
                         client.purchaseHistory.map((item, idx) => (
                           <div key={idx} className="p-4 bg-gray-50/50 rounded-2xl flex items-center justify-between border border-transparent hover:border-gray-100 group transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                                    <Tag size={14} />
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-gray-900">{item.productName}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.date}</p>
                                 </div>
                              </div>
                              <p className="text-sm font-black text-gray-900">₹{item.price}</p>
                           </div>
                         ))
                       ) : (
                         <p className="text-gray-400 text-xs italic">No purchase history yet.</p>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {/* Full Timeline */}
           <div className="mt-16 pt-10 border-t border-gray-100">
              <h4 className="text-xl font-serif font-black text-gray-900 mb-8">Service Mastery Timeline</h4>
              <div className="space-y-6">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-8 relative group">
                       <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full border-2 border-[#D4AF37] bg-white z-10"></div>
                          <div className="w-0.5 flex-1 bg-gray-100 group-last:hidden"></div>
                       </div>
                       <div className="flex-1 pb-10">
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">October 12, 2023</p>
                             <p className="text-sm font-black text-[#D4AF37]">₹2,499</p>
                          </div>
                          <div className="p-6 bg-gray-50/50 group-hover:bg-white border border-transparent group-hover:border-gray-100 group-hover:shadow-lg rounded-[32px] transition-all">
                             <h6 className="font-bold text-gray-900 mb-2">Premium Color & Styling</h6>
                             <p className="text-xs text-gray-500 leading-relaxed">Full highlights with scalp treatment. Client requested intense hydration due to previous dryness. Excellent result, Maria was very satisfied.</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
