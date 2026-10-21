import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";
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
    Plus,
    X,
    Banknote,
    CreditCard,
    Smartphone
} from "lucide-react";
import { NavLink } from "react-router-dom";

const SalonBookingsPage = () => {
    const { showNotification } = useNotification();
    const socket = useSocket();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [checkInPin, setCheckInPin] = useState("");
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [cardCheckInPins, setCardCheckInPins] = useState({});
    const [cardCheckInLoading, setCardCheckInLoading] = useState({});
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [extraBooking, setExtraBooking] = useState(null);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [selectedExtraIds, setSelectedExtraIds] = useState([]);
    const [extraLoading, setExtraLoading] = useState(false);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
                        try {
            const response = await axiosInstance.get("/bookings/salon-bookings");
            if (response.data.success) {
                const list = response.data.data?.bookings || response.data.data || [];
                setBookings(Array.isArray(list) ? list : []);
            } else {
                setBookings([]);
            }
        } catch {
            // silently fail — empty state shown
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (!socket) return undefined;

        const handleBookingUpdate = (data) => {
            if (!data?.booking?._id) {
                fetchBookings();
                return;
            }

            setBookings((currentBookings) => {
                const nextBooking = data.booking;
                const exists = currentBookings.some((booking) => booking._id === nextBooking._id);
                return exists
                    ? currentBookings.map((booking) => booking._id === nextBooking._id ? { ...booking, ...nextBooking } : booking)
                    : [nextBooking, ...currentBookings];
            });
        };

        socket.on("bookingUpdate", handleBookingUpdate);
        socket.on("salonBookingUpdate", handleBookingUpdate);
        return () => {
            socket.off("bookingUpdate", handleBookingUpdate);
            socket.off("salonBookingUpdate", handleBookingUpdate);
        };
    }, [fetchBookings, socket]);

    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            const response = await axiosInstance.patch(`/bookings/${bookingId}/status`, { status: newStatus });
            if (response.data.success) {
                // Update local state
                setBookings(prev => (Array.isArray(prev) ? prev : []).map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
                showNotification(`Booking status updated to ${newStatus}`, "success");
            }
        } catch {
            showNotification("Failed to update status. Please try again.", "error");
        }
    };

    const handleVerifyPin = async (event) => {
        event.preventDefault();
        if (!/^\d{4}$/.test(checkInPin)) {
            showNotification("Enter the customer's 4-digit PIN.", "error");
            return;
        }
        setCheckInLoading(true);
        try {
            const response = await axiosInstance.post("/bookings/verify-pin", { pin: checkInPin });
            if (response.data.success) {
                setCheckInPin("");
                await fetchBookings();
                showNotification("Customer checked in and seat released.", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Invalid or unavailable PIN.", "error");
        } finally {
            setCheckInLoading(false);
        }
    };

    const handleCardVerifyPin = async (event, booking) => {
        event.preventDefault();
        const pin = String(cardCheckInPins[booking._id] || "").trim();
        if (!/^\d{4}$/.test(pin)) {
            showNotification("Enter the customer's 4-digit PIN.", "error");
            return;
        }
        setCardCheckInLoading((current) => ({ ...current, [booking._id]: true }));
        try {
            const response = await axiosInstance.post("/bookings/verify-pin", {
                bookingId: booking._id,
                pin,
            });
            if (response.data.success) {
                const updatedBooking = response.data.data || {};
                setBookings((current) => current.map((currentBooking) => (
                    currentBooking._id === booking._id
                        ? { ...currentBooking, ...updatedBooking, status: "in_progress" }
                        : currentBooking
                )));
                setCardCheckInPins((current) => ({ ...current, [booking._id]: "" }));
                showNotification("Customer checked in and service started.", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Invalid or unavailable PIN.", "error");
        } finally {
            setCardCheckInLoading((current) => ({ ...current, [booking._id]: false }));
        }
    };

    const openExtraServices = async (booking) => {
        try {
            const response = await axiosInstance.get(`/services/salon/${booking.salon?._id || booking.salon}`);
            setServiceOptions(response.data?.data || []);
            setSelectedExtraIds([]);
            setExtraBooking(booking);
        } catch {
            showNotification("Unable to load salon services.", "error");
        }
    };

    const handleAddExtras = async () => {
        if (!extraBooking || selectedExtraIds.length === 0) return;
        setExtraLoading(true);
        try {
            await axiosInstance.patch(`/bookings/${extraBooking._id}/services`, { serviceIds: selectedExtraIds });
            setExtraBooking(null);
            await fetchBookings();
            showNotification("Extra services added.", "success");
        } catch (error) {
            showNotification(error.response?.data?.message || "Unable to add extra services.", "error");
        } finally {
            setExtraLoading(false);
        }
    };

    const handleCompleteBooking = async () => {
        if (!paymentBooking) return;
        setPaymentLoading(true);
        try {
            await axiosInstance.post(`/bookings/${paymentBooking._id}/complete`, { paymentMethod });
            setPaymentBooking(null);
            await fetchBookings();
            showNotification("Payment recorded and booking completed.", "success");
        } catch (error) {
            showNotification(error.response?.data?.message || "Unable to complete booking.", "error");
        } finally {
            setPaymentLoading(false);
        }
    };

    const bookingList = Array.isArray(bookings) ? bookings : [];
    const filteredBookings = bookingList.filter(b => {
        if (filter === "all") return true;
        return b.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
            case "confirmed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "pending_payment": return "bg-amber-100 text-amber-700 border-amber-200";
            case "in_progress": return "bg-blue-100 text-blue-700 border-blue-200";
            case "completed": return "bg-amber-50 text-amber-700 border-amber-200";
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
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-8">
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-2">Booking Requests</h1>
                        <p className="text-gray-500">Manage incoming appointments and salon schedule.</p>
                    </div>

                    <div className="relative flex items-center gap-3">
                        <form onSubmit={handleVerifyPin} className="flex items-center gap-2">
                            <input
                                value={checkInPin}
                                onChange={(event) => setCheckInPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="Check-in PIN"
                                className="w-32 rounded-full border border-gray-200 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#D4AF37]"
                            />
                            <button type="submit" disabled={checkInLoading} className="salon-action-button salon-action-button--dark rounded-full">
                                {checkInLoading ? <Loader2 size={14} className="animate-spin" /> : "Check in"}
                            </button>
                        </form>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="salon-action-button salon-action-button--secondary rounded-full"
                        >
                            <Filter size={16} />
                            Filter: {filter.replace('_', ' ')}
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <NavLink
                            to="/salon/manage"
                            className="salon-action-button salon-action-button--dark rounded-full"
                        >
                            <Settings size={16} className="text-[#D4AF37]" />
                            Manage services and staff
                        </NavLink>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                {["all", "pending", "confirmed", "in_progress", "completed", "cancelled", "rejected"].map((option) => (
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
                    <div className="grid grid-cols-1 gap-4">
                        {filteredBookings.map((booking) => (
                            <div key={booking._id} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    {/* Left: Customer Initials/Avatar */}
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-[#1A1A1A] flex items-center justify-center text-white text-2xl font-bold border-2 border-[#D4AF37] shrink-0">
                                        {booking.customer?.fullName?.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Middle: Details */}
                                    <div className="flex-1 space-y-4">
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
                                                <div className={`px-5 py-2 rounded-full text-sm font-normal capitalize border flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                                                    {booking.status === 'confirmed' && <CheckCircle size={14} />}
                                                    {booking.status?.toUpperCase()}
                                                </div>
                                                <p className="text-2xl font-black text-[#1a1a1a]">
                                                    <span className="text-lg font-medium text-[#D4AF37] mr-1">₹</span>
                                                    {booking.totalAmount}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="ui-label">Date</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a]">{booking.date}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Clock size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="ui-label">Time</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a]">{booking.time}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Scissors size={18} className="text-[#D4AF37] shrink-0" />
                                                <div>
                                                    <p className="ui-label">Services</p>
                                                    <p className="text-sm font-bold text-[#1a1a1a] truncate">
                                                        {booking.serviceNames?.join(", ")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-4 border-t border-gray-50 flex gap-3">
                                            {booking.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking._id, "confirmed")}
                                                        className="salon-action-button salon-action-button--success flex-1 shadow-md shadow-emerald-600/10"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking._id, "rejected")}
                                                        className="salon-action-button salon-action-button--danger flex-1"
                                                    >
                                                        <XCircle size={16} />
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                            {booking.verificationPin && ["confirmed", "pending_payment"].includes(booking.status) && (
                                <form onSubmit={(event) => handleCardVerifyPin(event, booking)} className="flex w-full flex-col gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 sm:flex-row sm:items-center">
                                    <label htmlFor={`check-in-pin-${booking._id}`} className="sr-only">Enter 4-digit PIN</label>
                                    <input
                                        id={`check-in-pin-${booking._id}`}
                                        value={cardCheckInPins[booking._id] || ""}
                                        onChange={(event) => setCardCheckInPins((current) => ({ ...current, [booking._id]: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                                        inputMode="numeric"
                                        maxLength={4}
                                        placeholder="Enter 4-digit PIN"
                                        className="min-w-0 flex-1 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold outline-none focus:border-[#D4AF37]"
                                    />
                                    <button type="submit" disabled={Boolean(cardCheckInLoading[booking._id])} className="salon-action-button salon-action-button--dark whitespace-nowrap rounded-full">
                                        {cardCheckInLoading[booking._id] ? <Loader2 size={14} className="animate-spin" /> : "Verify & Start Service"}
                                    </button>
                                </form>
                            )}
                            {booking.status === "in_progress" && (
                                <>
                                    <button onClick={() => openExtraServices(booking)} className="salon-action-button salon-action-button--secondary flex-1">
                                        <Plus size={16} /> Add services
                                    </button>
                                    <button onClick={() => { setPaymentBooking(booking); setPaymentMethod("cash"); }} className="salon-action-button salon-action-button--dark flex-1">
                                        <CheckCircle size={16} className="text-[#D4AF37]" /> Mark as Complete
                                    </button>
                                </>
                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {paymentBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-serif font-bold">Collect payment</h2>
                            <button onClick={() => setPaymentBooking(null)}><X size={20} /></button>
                        </div>
                        <p className="mb-4 text-sm text-gray-500">Amount due: <strong className="text-gray-900">₹{paymentBooking.totalAmount || 0}</strong></p>
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "upi", label: "UPI" }].map(({ value, label }) => (
                                <button key={value} onClick={() => setPaymentMethod(value)} className={`rounded-2xl border p-3 text-xs font-bold ${paymentMethod === value ? "border-[#D4AF37] bg-amber-50" : "border-gray-200"}`}>
                                    {value === "cash" && <Banknote size={18} className="mx-auto mb-1 text-[#D4AF37]" />}
                                    {value === "card" && <CreditCard size={18} className="mx-auto mb-1 text-[#D4AF37]" />}
                                    {value === "upi" && <Smartphone size={18} className="mx-auto mb-1 text-[#D4AF37]" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCompleteBooking} disabled={paymentLoading} className="salon-action-button salon-action-button--dark w-full justify-center">
                            {paymentLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm payment & complete"}
                        </button>
                    </div>
                </div>
            )}

            {extraBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-serif font-bold">Add extra services</h2>
                            <button onClick={() => setExtraBooking(null)}><X size={20} /></button>
                        </div>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {serviceOptions.map((service) => (
                                <label key={service._id} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 p-3 text-sm">
                                    <span>{service.name} · ₹{service.price || 0}</span>
                                    <input type="checkbox" checked={selectedExtraIds.includes(service._id)} onChange={() => setSelectedExtraIds((current) => current.includes(service._id) ? current.filter((id) => id !== service._id) : [...current, service._id])} />
                                </label>
                            ))}
                        </div>
                        <button onClick={handleAddExtras} disabled={extraLoading || selectedExtraIds.length === 0} className="salon-action-button salon-action-button--dark mt-5 w-full justify-center">
                            {extraLoading ? <Loader2 size={16} className="animate-spin" /> : "Add selected services"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalonBookingsPage;
