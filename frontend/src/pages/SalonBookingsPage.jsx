import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { 
    Calendar, 
    Clock, 
    User, 
    CheckCircle, 
    XCircle, 
    MessageSquare, 
    Filter,
    Loader2,
    Scissors,
    Phone,
    Mail,
    ChevronDown,
    Settings,
    LayoutDashboard,
    Grid,
    List,
    Plus,
    Activity as ActivityIcon,
    Users as UsersIcon
} from "lucide-react";
import { NavLink } from "react-router-dom";

// New Dashboard Components
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { StaffLeaderboard } from "../components/dashboard/StaffLeaderboard";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { VisualCalendar } from "../components/dashboard/VisualCalendar";
import { WaitlistPanel } from "../components/dashboard/WaitlistPanel";
import { Client360Modal } from "../components/dashboard/Client360Modal";

const SalonBookingsPage = () => {
    const { showNotification } = useNotification();
    
    // Core Data
    const [bookings, setBookings] = useState([]);
    const [salons, setSalons] = useState([]);
    const [activeSalon, setActiveSalon] = useState(null);
    const [staff, setStaff] = useState([]);
    
    // Dashboard Specific Data
    const [snapshot, setSnapshot] = useState({});
    const [leaderboard, setLeaderboard] = useState([]);
    const [activity, setActivity] = useState([]);
    const [waitlist, setWaitlist] = useState([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("calendar"); // "list" or "calendar"
    const [filter, setFilter] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSalonSelectorOpen, setIsSalonSelectorOpen] = useState(false);
    
    // Client Modal State
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const salonRes = await axiosInstance.get("/salons/owner/my-salon");
            if (salonRes.data.success && salonRes.data.data.length > 0) {
                const salonsData = salonRes.data.data;
                setSalons(salonsData);
                if (!activeSalon) setActiveSalon(salonsData[0]);
            }
        } catch (error) {
            console.error("Error fetching salons:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async (salonId) => {
        try {
            const [
                bookingRes, 
                staffRes, 
                snapshotRes, 
                leaderboardRes, 
                activityRes, 
                waitlistRes
            ] = await Promise.all([
                axiosInstance.get("/bookings/salon-bookings"),
                axiosInstance.get(`/staff/salon/${salonId}`),
                axiosInstance.get(`/dashboard/snapshot/${salonId}`),
                axiosInstance.get(`/dashboard/leaderboard/${salonId}`),
                axiosInstance.get(`/dashboard/activity/${salonId}`),
                axiosInstance.get(`/waitlist/salon/${salonId}`)
            ]);

            if (bookingRes.data.success) setBookings(bookingRes.data.data);
            if (staffRes.data.success) setStaff(staffRes.data.data);
            if (snapshotRes.data.success) setSnapshot(snapshotRes.data.data);
            if (leaderboardRes.data.success) setLeaderboard(leaderboardRes.data.data);
            if (activityRes.data.success) setActivity(activityRes.data.data);
            if (waitlistRes.data.success) setWaitlist(waitlistRes.data.data);
            
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeSalon) {
            fetchDashboardData(activeSalon._id);
        }
    }, [activeSalon]);

    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            const response = await axiosInstance.patch(`/bookings/${bookingId}/status`, { status: newStatus });
            if (response.data.success) {
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
                showNotification(`Booking status updated to ${newStatus}`, "success");
                // Refresh snapshot
                fetchDashboardData(activeSalon._id);
            }
        } catch (error) {
            showNotification("Failed to update status.", "error");
        }
    };

    const handleReschedule = async (bookingId, newDetails) => {
        try {
            const response = await axiosInstance.patch(`/bookings/${bookingId}/reschedule`, newDetails);
            if (response.data.success) {
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, ...newDetails } : b));
                showNotification("Appointment rescheduled successfully!", "success");
            }
        } catch (error) {
            showNotification("Rescheduling failed. Slot might be booked.", "error");
        }
    };

    const handleNotifyWaitlistClient = async (waitlistId) => {
        try {
            const response = await axiosInstance.post(`/waitlist/notify/${waitlistId}`);
            if (response.data.success) {
                setWaitlist(prev => prev.map(w => w._id === waitlistId ? { ...w, status: "offered" } : w));
                showNotification("Offer sent to waitlisted client!", "success");
            }
        } catch (error) {
            showNotification("Failed to notify client.", "error");
        }
    };

    const handleRemoveWaitlist = async (waitlistId) => {
        try {
            const response = await axiosInstance.patch(`/waitlist/${waitlistId}`, { status: "cancelled" });
            if (response.data.success) {
                setWaitlist(prev => prev.filter(w => w._id !== waitlistId));
                showNotification("Removed from waitlist.", "info");
            }
        } catch (error) {
            showNotification("Operation failed.", "error");
        }
    };

    const openClient360 = (client) => {
        setSelectedClient(client);
        setIsClientModalOpen(true);
    };

    const filteredBookings = bookings.filter(b => {
        if (filter === "all") return true;
        return b.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
            case "confirmed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "completed": return "bg-blue-100 text-blue-700 border-blue-200";
            case "rejected": return "bg-red-100 text-red-700 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-700 border-gray-200";
            case "no-show": return "bg-rose-100 text-rose-700 border-rose-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-24 px-4 md:px-12 font-sans bg-[#fafafa] min-h-screen">
            <div className="max-w-[1600px] mx-auto">
                
                {/* Dashboard Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pt-10 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/20">
                                Command Center
                            </span>
                        </div>
                        <div className="relative">
                            <button 
                                onClick={() => setIsSalonSelectorOpen(!isSalonSelectorOpen)}
                                className="flex items-center gap-3 text-4xl md:text-5xl font-serif font-black text-gray-900 group"
                            >
                                {activeSalon?.name}
                                <ChevronDown size={32} className={`text-[#D4AF37] transition-transform duration-300 ${isSalonSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isSalonSelectorOpen && (
                                <div className="absolute top-full left-0 mt-4 w-72 bg-white rounded-[32px] shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-4 border-b border-gray-50 mb-2">Switch Workspace</p>
                                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                        {salons.map(s => (
                                            <button
                                                key={s._id}
                                                onClick={() => {
                                                    setActiveSalon(s);
                                                    setIsSalonSelectorOpen(false);
                                                }}
                                                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${activeSalon?._id === s._id ? 'bg-[#D4AF37]/10 text-gray-900' : 'hover:bg-gray-50 text-gray-500'}`}
                                            >
                                                <span className="font-bold text-sm">{s.name}</span>
                                                {activeSalon?._id === s._id && <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        {/* View Switcher */}
                        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <button 
                                onClick={() => setViewMode("calendar")}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${viewMode === "calendar" ? "bg-[#1a1a1a] text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <Grid size={16} />
                                Calendar
                            </button>
                            <button 
                                onClick={() => setViewMode("list")}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${viewMode === "list" ? "bg-[#1a1a1a] text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <List size={16} />
                                List View
                            </button>
                        </div>
                        
                        <NavLink 
                            to="/salon/manage"
                            className="bg-white border border-gray-100 p-3.5 rounded-2xl text-gray-400 hover:text-[#D4AF37] hover:shadow-md transition-all"
                        >
                            <Settings size={22} />
                        </NavLink>
                    </div>
                </div>

                {/* Today's Snapshot Stats */}
                <div className="mb-12">
                   <DashboardStats stats={snapshot} loading={loading} />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* Left Column (Calendar or List) */}
                    <div className="xl:col-span-9 space-y-8">
                        {viewMode === "calendar" ? (
                            <VisualCalendar 
                                bookings={bookings} 
                                staff={staff} 
                                onReschedule={handleReschedule} 
                            />
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                   <h3 className="text-2xl font-serif font-black text-gray-900">List Appointments</h3>
                                   <div className="relative">
                                        <button 
                                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                                            className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 font-bold text-[10px] uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <Filter size={14} />
                                            Filter: {filter}
                                        </button>
                                        {isFilterOpen && (
                                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20">
                                                {["all", "pending", "confirmed", "completed", "rejected", "no-show"].map((option) => (
                                                    <button 
                                                        key={option}
                                                        onClick={() => { setFilter(option); setIsFilterOpen(false); }}
                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold capitalize ${filter === option ? "text-[#D4AF37] bg-[#D4AF37]/5" : "text-gray-600 hover:bg-gray-50"}`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                   </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredBookings.map((booking) => (
                                        <div key={booking._id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 hover:shadow-xl transition-all relative overflow-hidden group">
                                            <div className={`absolute top-8 right-8 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${getStatusColor(booking.status)}`}>
                                                {booking.status}
                                            </div>

                                            <div className="flex items-start gap-4 mb-8">
                                                <button 
                                                    onClick={() => openClient360(booking.customer)}
                                                    className="w-16 h-16 rounded-[22px] bg-[#1a1a1a] flex items-center justify-center text-white text-2xl font-black border-2 border-[#D4AF37] hover:scale-105 transition-transform"
                                                >
                                                    {booking.customer?.fullName?.charAt(0).toUpperCase()}
                                                </button>
                                                <div>
                                                    <h3 onClick={() => openClient360(booking.customer)} className="text-xl font-bold text-gray-900 cursor-pointer hover:text-[#D4AF37] transition-colors">
                                                        {booking.customer?.fullName}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <Phone size={12} className="text-[#D4AF37]" />
                                                            {booking.customer?.phonenumber}
                                                        </span>
                                                        <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <UsersIcon size={12} className="text-[#D4AF37]" />
                                                            With {booking.staff}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-6 rounded-2xl mb-8 flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Appointment Slot</p>
                                                    <div className="flex items-center gap-2 font-bold text-gray-800">
                                                        <Calendar size={14} className="text-[#D4AF37]" /> {booking.date}
                                                        <span className="mx-1 text-gray-300">|</span>
                                                        <Clock size={14} className="text-[#D4AF37]" /> {booking.time}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee</p>
                                                   <p className="text-xl font-black text-[#D4AF37]">₹{booking.totalAmount}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-8">
                                                {booking.serviceNames?.map((s, i) => (
                                                    <span key={i} className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-bold text-gray-600 flex items-center gap-2">
                                                        <Scissors size={12} className="text-[#D4AF37]" /> {s}
                                                    </span>
                                                ))}
                                            </div>

                                            {booking.status === "pending" && (
                                                <div className="flex gap-3 pt-6 border-t border-gray-50">
                                                    <button onClick={() => handleStatusUpdate(booking._id, "confirmed")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} /> Accept Request
                                                    </button>
                                                    <button onClick={() => handleStatusUpdate(booking._id, "rejected")} className="flex-1 bg-white border-2 border-rose-50 hover:border-rose-500 text-rose-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                                                        <XCircle size={16} /> Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Summary & Analytics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <StaffLeaderboard data={leaderboard} loading={loading} />
                            <div className="space-y-8">
                               <RecentActivity data={activity} loading={loading} />
                               <div className="bg-[#1a1a1a] rounded-[40px] p-8 text-white relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                  <h4 className="text-2xl font-serif font-black mb-4">Pro Insights</h4>
                                  <p className="text-gray-400 text-sm leading-relaxed mb-6 group-hover:text-white transition-colors">Your revenue is up by 15% this week. Master Stylist {leaderboard[0]?.name} is leading with highest client retention.</p>
                                  <button className="flex items-center gap-2 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                                     Download Report <ChevronDown size={14} className="-rotate-90" />
                                  </button>
                               </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Waitlist & Quick Tips) */}
                    <div className="xl:col-span-3 space-y-8">
                        <WaitlistPanel 
                            data={waitlist} 
                            loading={loading} 
                            onNotify={handleNotifyWaitlistClient}
                            onRemove={handleRemoveWaitlist}
                        />
                        
                        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
                           <h4 className="text-xl font-serif font-black text-gray-900 mb-6 flex items-center gap-2">
                              <Plus size={20} className="text-[#D4AF37]" /> Quick Actions
                           </h4>
                           <div className="space-y-3">
                              {["Blacklist No-Shows", "Export CSV", "Send Promo Email"].map((action, i) => (
                                 <button key={i} className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all font-bold text-xs uppercase tracking-widest text-gray-500 flex items-center justify-between group">
                                    {action}
                                    <ChevronDown size={14} className="-rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </button>
                              ))}
                           </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <Client360Modal 
                    client={selectedClient} 
                    isOpen={isClientModalOpen} 
                    onClose={() => setIsClientModalOpen(false)} 
                />

            </div>
        </div>
    );
};

export default SalonBookingsPage;
