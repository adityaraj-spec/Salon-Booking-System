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
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-12">
            <div>
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
                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold capitalize transition-colors ${filter === option ? "text-[#D4AF37] bg-[#D4AF37]/5" : "text-gray-600 hover:bg-gray-50"
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
                    <div className="grid grid-cols-1 gap-6">
                        {filteredBookings.map((booking) => (
                            <div key={booking._id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Left: Customer Initials/Avatar */}
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-[#1A1A1A] flex items-center justify-center text-white text-3xl font-bold border-2 border-[#D4AF37] shrink-0">
                                        {booking.customer?.fullName?.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Middle: Details */}
                                    <div className="flex-1 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-black text-[#D4AF37] mb-1">
                                                    {booking.customer?.fullName}
                                                    {booking.bookingNumber && <span className="text-xs text-gray-400 font-normal ml-2 tracking-widest">#{booking.bookingNumber}</span>}
                                                </h3>
                                                <div className="flex items-center gap-4 text-gray-500">
                                                    <a href={`tel:${booking.customer?.phonenumber}`} className="flex items-center gap-1.5 text-sm hover:text-[#D4AF37] transition-colors font-medium">
                                                        <Phone size={14} className="text-[#D4AF37]" />
                                                        {booking.customer?.phonenumber}
                                                    </a>
                                                    <a href={`mailto:${booking.customer?.email}`} className="flex items-center gap-1.5 text-sm hover:text-[#D4AF37] transition-colors font-medium">
                                                        <Mail size={14} className="text-[#D4AF37]" />
                                                        Contact
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-3">
                                                <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                                                    {booking.status === 'confirmed' && <CheckCircle size={14} />}
                                                    {booking.status}
                                                </div>
                                                <p className="text-2xl font-black text-[#1a1a1a]">
                                                    <span className="text-lg font-medium text-[#D4AF37] mr-1">₹</span>
                                                    {booking.totalAmount}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 pt-6 border-t border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a]">{booking.date}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Clock size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a]">{booking.time}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Scissors size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Services</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a] truncate">
                                                        {booking.serviceNames?.join(", ")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-6 border-t border-gray-50 flex gap-3">
                                            {booking.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking._id, "confirmed")}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking._id, "rejected")}
                                                        className="flex-1 bg-white border-2 border-red-50 hover:border-red-500 text-red-500 font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <XCircle size={16} />
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                            {booking.status === "confirmed" && (
                                                <button
                                                    onClick={() => handleStatusUpdate(booking._id, "completed")}
                                                    className="flex-1 bg-[#1A1A1A] hover:bg-black text-white font-bold text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={16} className="text-[#D4AF37]" />
                                                    Mark as Completed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalonBookingsPage;
