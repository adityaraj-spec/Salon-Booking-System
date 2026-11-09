import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useBookingCart } from "../context/BookingCartContext";
import { useSocket } from "../context/SocketContext";
import {
    Calendar,
    Clock,
    MapPin,
    Scissors,
    CheckCircle2,
    Phone,
    User,
    AlertCircle,
    X,
    Loader2,
    RotateCcw,
    Users,
    KeyRound
} from "lucide-react";
import { BookingCardSkeleton } from "../components/skeletons/index.jsx";
import salonPlaceholder from "../assets/salon1.jpg";

const getStatusBadge = (status, queuePosition) => {
    switch (status) {
        case "requested":
            return {
                label: "Awaiting Acceptance",
                className: "bg-amber-50 text-amber-700 border-amber-200",
                dot: "bg-amber-500 animate-ping",
            };
        case "waiting":
        case "accepted":
            return {
                label: queuePosition ? `Queue #${queuePosition}` : "In Queue",
                className: "bg-[#fdfcf5] text-[#D4AF37] border-[#D4AF37]/30",
                dot: "bg-[#D4AF37] animate-pulse",
            };
        case "arrived":
            return {
                label: "Checked In at Salon",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                dot: "bg-emerald-500",
            };
        case "in_progress":
            return {
                label: "In Service",
                className: "bg-purple-50 text-purple-700 border-purple-200",
                dot: "bg-purple-500 animate-pulse",
            };
        case "completed":
            return {
                label: "Completed",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                dot: "bg-emerald-600",
            };
        case "rejected":
            return {
                label: "Declined by Salon",
                className: "bg-red-50 text-red-600 border-red-200",
                dot: "bg-red-500",
            };
        case "expired":
            return {
                label: "Timed Out",
                className: "bg-gray-100 text-gray-500 border-stone-200/70",
                dot: "bg-gray-400",
            };
        case "confirmed":
            return {
                label: "Confirmed",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
                dot: "bg-emerald-500",
            };
        default:
            return {
                label: status,
                className: "bg-gray-50 text-gray-700 border-stone-200/70",
                dot: "bg-gray-400",
            };
    }
};

export function MyBookingsPage() {
    const navigate = useNavigate();
    const { setCartServices } = useBookingCart();
    const socket = useSocket();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelModalBooking, setCancelModalBooking] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const [cancelSuccess, setCancelSuccess] = useState("");
    const [bookAgainLoading, setBookAgainLoading] = useState(null);
    const [checkingInId, setCheckingInId] = useState(null);

    const fetchBookings = useCallback(async () => {
        try {
            const response = await axiosInstance.get("/bookings/my-bookings");
            if (response.data.success) {
                setBookings(response.data.data?.bookings || []);
            }
        } catch {
            // silently fail - empty state is shown
        } finally {
            setLoading(false);
        }
    }, []);

    const handleBookAgain = async (booking) => {
        const salonId = booking.salon?._id || booking.salon;
        if (!salonId) return;
        setBookAgainLoading(booking._id);

        let services = [];
        if (booking.snapshotServices && booking.snapshotServices.length > 0) {
            services = booking.snapshotServices.map((s) => ({
                _id: s.serviceId || s._id,
                serviceId: s.serviceId || s._id,
                name: s.name,
                price: Number(s.price) || 0,
                durationMin: Number(s.durationMin) || 30,
            }));
        } else if (booking.serviceNames && booking.serviceNames.length > 0) {
            services = booking.serviceNames.map((name, i) => ({
                _id: `rebooking-${i}`,
                serviceId: `rebooking-${i}`,
                name,
                price: 0,
                durationMin: 30,
            }));
        }

        setCartServices(salonId, services);
        setBookAgainLoading(null);
        navigate(`/shop/${salonId}`);
    };

    const handleCheckIn = async (bookingId) => {
        setCheckingInId(bookingId);
        try {
            const res = await axiosInstance.post(`/queue/${bookingId}/check-in`);
            if (res.data?.success) {
                setBookings((prev) =>
                    prev.map((b) => (b._id === bookingId ? { ...b, status: "arrived", arrivedAt: new Date() } : b))
                );
            }
        } catch (err) {
            console.error("Check in error:", err);
        } finally {
            setCheckingInId(null);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        if (!socket) return undefined;

        const handleBookingUpdate = (data) => {
            fetchBookings();
        };

        socket.on("bookingUpdate", handleBookingUpdate);
        socket.on("queue:request_accepted", handleBookingUpdate);
        socket.on("queue:request_rejected", handleBookingUpdate);
        socket.on("queue:request_expired", handleBookingUpdate);
        socket.on("queue:service_started", handleBookingUpdate);
        socket.on("queue:service_completed", handleBookingUpdate);
        socket.on("queue:updated", handleBookingUpdate);

        return () => {
            socket.off("bookingUpdate", handleBookingUpdate);
            socket.off("queue:request_accepted", handleBookingUpdate);
            socket.off("queue:request_rejected", handleBookingUpdate);
            socket.off("queue:request_expired", handleBookingUpdate);
            socket.off("queue:service_started", handleBookingUpdate);
            socket.off("queue:service_completed", handleBookingUpdate);
            socket.off("queue:updated", handleBookingUpdate);
        };
    }, [fetchBookings, socket]);

    const handleConfirmCancel = async () => {
        if (!cancelModalBooking) return;
        setCancelling(true);
        setCancelError("");
        try {
            const res = await axiosInstance.post(`/bookings/${cancelModalBooking._id}/cancel`, {
                reason: cancelReason || "Customer cancelled",
            });
            if (res.data.success) {
                setCancelSuccess("Your booking has been cancelled.");
                setCancelModalBooking(null);
                fetchBookings();
                setTimeout(() => setCancelSuccess(""), 4000);
            }
        } catch (err) {
            setCancelError(err.response?.data?.message || "Failed to cancel booking. Please try again.");
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 space-y-6">
                <BookingCardSkeleton />
                <BookingCardSkeleton />
                <BookingCardSkeleton />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] py-12 md:py-16">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-[#1a1a1a]">My Appointments & Queue</h1>
                        <p className="text-sm text-gray-500 mt-1">Track your live salon queues and view previous visits</p>
                    </div>
                </div>

                {cancelSuccess && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium">{cancelSuccess}</span>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border border-stone-200/50 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-xl font-sans font-semibold tracking-tight text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Ready for your next salon experience? Browse our collection of top-rated parlors.</p>
                        <a href="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-black transition-colors">
                            Explore Salons
                        </a>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {bookings.map((booking) => {
                            const isQueue = booking.bookingType === "queue" || !booking.date;
                            const badge = getStatusBadge(booking.status, booking.queuePosition);

                            return (
                                <div key={booking._id} className="relative bg-white rounded-[36px] p-6 lg:p-8 shadow-sm border border-stone-200/50 flex flex-col lg:flex-row gap-6 lg:gap-8 hover:shadow-md transition-all duration-300">

                                    {/* Status Badge - Top Right */}
                                    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold border flex items-center gap-2 shadow-sm ${badge.className}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></div>
                                            <span>{badge.label}</span>
                                        </div>
                                    </div>

                                    {/* PART 1: IMAGE (Left) */}
                                    <div className="w-full lg:w-52 h-48 lg:h-auto rounded-[28px] overflow-hidden shrink-0 shadow-sm border border-stone-200/50 relative group">
                                        <img
                                            src={booking.salon?.images?.[0] || salonPlaceholder}
                                            alt={booking.salon?.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                    </div>

                                    {/* PART 2: SALON INFO & QUEUE/TIME STATS (Middle) */}
                                    <div className="flex-1 flex flex-col justify-center py-1">
                                        <div className="space-y-3">
                                            <h3 className="text-xl md:text-2xl font-sans font-semibold tracking-tight text-[#1a1a1a]">
                                                {booking.salon?.name || "Style Station"}
                                            </h3>
                                            <div className="flex items-start gap-2.5 text-gray-500 bg-gray-50/70 w-fit px-3.5 py-2 rounded-xl border border-stone-200/50 max-w-sm">
                                                <MapPin size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-700 leading-snug">{booking.salon?.address || "No address provided"}</span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5 font-semibold capitalize">{booking.salon?.city}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* QUEUE VS LEGACY TIME METRICS */}
                                        <div className="mt-5 grid grid-cols-2 gap-3 max-w-md">
                                            {isQueue ? (
                                                <>
                                                    <div className="flex items-center gap-3 bg-amber-50/50 px-4 py-2.5 rounded-2xl border border-amber-100/60">
                                                        <Users size={18} className="text-[#D4AF37]" />
                                                        <div className="flex flex-col">
                                                            <p className="text-[11px] font-semibold text-gray-400">Position</p>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {booking.queuePosition ? `#${booking.queuePosition}` : "Pending"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-amber-50/50 px-4 py-2.5 rounded-2xl border border-amber-100/60">
                                                        <Clock size={18} className="text-[#D4AF37]" />
                                                        <div className="flex flex-col">
                                                            <p className="text-[11px] font-semibold text-gray-400">Est. Wait</p>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                ~{booking.estimatedWaitMin || 0} – {booking.estimatedWaitMax || 15}m
                                                            </p>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-stone-200/50">
                                                        <Clock size={18} className="text-[#D4AF37]" />
                                                        <div className="flex flex-col">
                                                            <p className="text-[11px] font-semibold text-gray-400">Time</p>
                                                            <p className="text-sm font-bold text-gray-800">{booking.time}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-2xl border border-stone-200/50">
                                                        <Calendar size={18} className="text-[#D4AF37]" />
                                                        <div className="flex flex-col">
                                                            <p className="text-[11px] font-semibold text-gray-400">Date</p>
                                                            <p className="text-sm font-bold text-gray-800">
                                                                {booking.date ? new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* PART 3: DETAILS & ACTIONS (Right) */}
                                    <div className="lg:w-[45%] bg-gray-50/60 rounded-[28px] p-6 border border-stone-200/50 flex flex-col justify-between gap-5">
                                        
                                        {/* 4-DIGIT CHECK-IN PIN CARD */}
                                        {booking.verificationPin && (
                                            <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/60 p-4 flex items-center justify-between shadow-sm">
                                                <div>
                                                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-md inline-block mb-1">
                                                        Check-in Verification PIN
                                                    </span>
                                                    <p className="text-3xl font-black font-mono tracking-pin text-[#1a1a1a] my-0.5">
                                                        {booking.verificationPin}
                                                    </p>
                                                    <p className="text-[11px] text-amber-900 font-medium">Show this 4-digit code to your stylist</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-[#D4AF37] shrink-0">
                                                    <KeyRound size={22} />
                                                </div>
                                            </div>
                                        )}

                                        {/* SERVICES & TOTAL */}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 mb-2">Selected Services</p>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {booking.serviceNames?.length > 0 ? (
                                                    booking.serviceNames.map((s, i) => (
                                                        <span key={i} className="text-xs bg-white border border-stone-200/70/70 px-3 py-1 rounded-full font-medium text-gray-700">
                                                            {s}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">Salon Service</span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-stone-200/70/60 text-sm">
                                                <span className="text-gray-500">Total Payable</span>
                                                <span className="font-bold font-sans text-lg text-gray-900">₹{booking.totalAmount || 0}</span>
                                            </div>
                                        </div>

                                        {/* ACTION BUTTONS */}
                                        <div className="pt-2 flex items-center justify-between gap-3">
                                            {/* ARRIVAL CHECK-IN ACTION FOR WAITING QUEUE */}
                                            {booking.status === "waiting" && (
                                                <button
                                                    onClick={() => handleCheckIn(booking._id)}
                                                    disabled={checkingInId === booking._id}
                                                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#D4AF37] hover:bg-[#B8962E] text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    {checkingInId === booking._id ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                                                    <span>I Have Arrived</span>
                                                </button>
                                            )}

                                            {/* CANCELLATION FOR UNCONFIRMED / WAITING */}
                                            {["requested", "waiting", "pending_payment"].includes(booking.status) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCancelModalBooking(booking);
                                                        setCancelError("");
                                                        setCancelReason("");
                                                    }}
                                                    className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            {/* REBOOK CTA FOR COMPLETED / CANCELLED */}
                                            {["completed", "cancelled", "rejected"].includes(booking.status) && booking.salon?._id && (
                                                <button
                                                    type="button"
                                                    disabled={bookAgainLoading === booking._id}
                                                    onClick={() => handleBookAgain(booking)}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-xs font-bold hover:bg-black transition-all shadow-sm"
                                                >
                                                    {bookAgainLoading === booking._id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={13} className="text-[#D4AF37]" />}
                                                    <span>Join Queue Again</span>
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cancellation Modal */}
            {cancelModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-stone-200/50">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-sans font-bold text-gray-900">Cancel Request</h3>
                            <button
                                onClick={() => setCancelModalBooking(null)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to cancel your place in queue at <strong>{cancelModalBooking.salon?.name}</strong>?
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Reason (optional)
                            </label>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Change of plans..."
                                className="w-full px-4 py-2.5 rounded-xl border border-stone-200/70 text-sm focus:outline-none focus:border-[#D4AF37]"
                            />
                        </div>

                        {cancelError && (
                            <p className="text-xs text-red-600 mb-4">{cancelError}</p>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCancelModalBooking(null)}
                                className="px-5 py-2.5 rounded-xl border border-stone-200/70 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Keep My Place
                            </button>
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={handleConfirmCancel}
                                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {cancelling && <Loader2 size={14} className="animate-spin" />}
                                <span>Confirm Cancellation</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
