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
    Settings
} from "lucide-react";
import { NavLink } from "react-router-dom";

const SalonBookingsPage = () => {
    const { showNotification } = useNotification();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/bookings/salon-bookings");
            if (response.data.success) {
                setBookings(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching salon bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            const response = await axiosInstance.patch(`/bookings/${bookingId}/status`, { status: newStatus });
            if (response.data.success) {
                // Update local state
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
                showNotification(`Booking status updated to ${newStatus}`, "success");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showNotification("Failed to update status. Please try again.", "error");
        }
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
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-12 px-6 md:px-12">

            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-2">Booking Requests</h1>
                        <p className="text-gray-500">Manage incoming appointments and salon schedule.</p>
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 font-bold text-xs uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Filter size={16} />
                            Filter: {filter.replace('_', ' ')}
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <NavLink 
                            to="/salon/manage"
                            className="flex items-center gap-2 bg-[#1A1A1A] px-5 py-2.5 rounded-full shadow-md text-white font-bold text-xs uppercase tracking-widest hover:bg-black transition-all"
                        >
                            <Settings size={16} className="text-[#D4AF37]" />
                            Manage Services & Staff
                        </NavLink>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                {["all", "pending", "confirmed", "completed", "rejected"].map((option) => (
                                    <button 
                                        key={option}
                                        onClick={() => {
                                            setFilter(option);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold capitalize transition-colors ${
                                            filter === option ? "text-[#D4AF37] bg-[#D4AF37]/5" : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="text-gray-300 w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">No Requests Found</h2>
                        <p className="text-gray-500 max-w-sm mx-auto">When customers book services at your salon, they will appear here for review.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredBookings.map((booking) => (
                            <div key={booking._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                                {/* Status Badge */}
                                <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                </div>

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-white text-xl font-bold border-2 border-[#D4AF37]">
                                        {booking.customer?.fullName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            {booking.customer?.fullName}
                                            {booking.bookingNumber && <span className="text-xs text-gray-400 font-normal">#{booking.bookingNumber}</span>}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <a href={`tel:${booking.customer?.phonenumber}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] transition-colors">
                                                <Phone size={12} />
                                                {booking.customer?.phonenumber}
                                            </a>
                                            <a href={`mailto:${booking.customer?.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] transition-colors">
                                                <Mail size={12} />
                                                Contact
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                            <Calendar size={14} className="text-[#D4AF37]" />
                                            {booking.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                            <Clock size={14} className="text-[#D4AF37]" />
                                            {booking.time}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue</p>
                                        <p className="text-lg font-bold text-[#D4AF37]">₹{booking.totalAmount}</p>
                                        <p className="text-[10px] text-gray-400">{booking.serviceNames?.length} Services</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Selected Services</p>
                                    <div className="flex flex-wrap gap-2">
                                        {booking.serviceNames?.map((service, idx) => (
                                            <span key={idx} className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-gray-700 flex items-center gap-2 shadow-sm">
                                                <Scissors size={10} className="text-[#D4AF37]" />
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {booking.status === "pending" && (
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={() => handleStatusUpdate(booking._id, "confirmed")}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} />
                                            Accept Request
                                        </button>
                                        <button 
                                            onClick={() => handleStatusUpdate(booking._id, "rejected")}
                                            className="flex-1 bg-white border-2 border-red-100 hover:border-red-500 text-red-500 font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={16} />
                                            Decline
                                        </button>
                                    </div>
                                )}

                                {booking.status === "confirmed" && (
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={() => handleStatusUpdate(booking._id, "completed")}
                                            className="flex-1 bg-[#1A1A1A] hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} className="text-[#D4AF37]" />
                                            Mark as Completed
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalonBookingsPage;
