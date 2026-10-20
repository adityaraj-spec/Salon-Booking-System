import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useBookingCart } from "../context/BookingCartContext";
import { useSocket } from "../context/SocketContext";
import { Calendar, Clock, MapPin, Scissors, CheckCircle2, Phone, User, AlertCircle, X, Loader2, RotateCcw } from "lucide-react";
import { BookingCardSkeleton } from "../components/skeletons/index.jsx";
import salonPlaceholder from "../assets/salon1.jpg";


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

    // Sprint 1.5: Book Again — pre-fills cart from past booking's snapshot services
    const handleBookAgain = async (booking) => {
        const salonId = booking.salon?._id || booking.salon;
        if (!salonId) return;
        setBookAgainLoading(booking._id);

        // Build service objects from snapshotServices if available, else from serviceNames
        let services = [];
        if (booking.snapshotServices && booking.snapshotServices.length > 0) {
            services = booking.snapshotServices.map(s => ({
                _id: s.serviceId || s._id,
                serviceId: s.serviceId || s._id,
                name: s.name,
                price: Number(s.price) || 0,
                durationMin: Number(s.durationMin) || 30,
            }));
        } else if (booking.serviceNames && booking.serviceNames.length > 0) {
            // Fallback: minimal objects from service name strings
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
        return () => socket.off("bookingUpdate", handleBookingUpdate);
    }, [fetchBookings, socket]);

    const handleConfirmCancel = async () => {
        if (!cancelModalBooking) return;
        setCancelling(true);
        setCancelError("");
        try {
            const res = await axiosInstance.post(`/bookings/${cancelModalBooking._id}/cancel`, {
                reason: cancelReason || undefined,
            });
            if (res.data?.success) {
                setCancelSuccess("Booking cancelled successfully.");
                setCancelModalBooking(null);
                setBookings((prev) =>
                    prev.map((b) =>
                        b._id === cancelModalBooking._id
                            ? { ...b, status: "cancelled", paymentStatus: "refunded" }
                            : b
                    )
                );
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
            <main className="flex-1 pb-20">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-10">
                    <div className="mb-6">
                        <div className="skeleton h-9 w-48 rounded-lg" />
                        <div className="skeleton h-4 w-72 rounded-full mt-3" />
                    </div>
                    <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => <BookingCardSkeleton key={i} />)}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 pb-20">

            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-10">
                <div className="mb-6 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a]">My Bookings</h1>
                    <p className="text-gray-400 mt-2 font-medium text-sm md:text-base">Manage your upcoming and past appointments</p>
                </div>

                {cancelSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium">{cancelSuccess}</span>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Ready for your next salon experience? Browse our collection of top-rated parlors.</p>
                        <a href="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-black transition-colors">
                            Explore Salons
                        </a>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="relative bg-white rounded-[40px] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 lg:gap-8 hover:shadow-md transition-all duration-300">

                                {/* Status Badge - Top Right */}
                                <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
                                    <div className="bg-[#fdfcf5] text-[#D4AF37] px-4 py-1.5 rounded-full text-[10px] font-bold border border-[#D4AF37]/20 flex items-center gap-2 shadow-sm capitalize">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></div>
                                        {booking.status}
                                    </div>
                                </div>

                                {/* PART 1: IMAGE (Left) */}
                                <div className="w-full lg:w-56 h-56 lg:h-auto rounded-[32px] overflow-hidden shrink-0 shadow-lg border border-white relative group">
                                    <img
                                        src={booking.salon?.images?.[0] || salonPlaceholder}
                                        alt={booking.salon?.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </div>

                                {/* PART 2: SALON INFO (Middle) */}
                                <div className="flex-1 flex flex-col justify-center py-2">
                                    <div className="space-y-4">
                                        <h3 className="text-2xl lg:text-3xl font-black text-[#1a1a1a] tracking-tight leading-none group">
                                            {booking.salon?.name || "Style Station"}
                                            <span className="block h-1 w-12 bg-[#D4AF37] mt-3 rounded-full group-hover:w-20 transition-all duration-500"></span>
                                        </h3>
                                        <div className="flex items-start gap-3 text-gray-500 bg-gray-50/50 w-fit px-4 py-2.5 rounded-2xl border border-gray-100/50 max-w-sm lg:max-w-md">
                                            <MapPin size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                            <div className="flex flex-col">
                                                <span className="ui-subtext text-sm leading-snug">{booking.salon?.address || "No address provided"}</span>
                                                <span className="ui-meta mt-1">{booking.salon?.city}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100/50">
                                            <Clock size={18} className="text-[#D4AF37]" />
                                            <div className="flex flex-col">
                                                <p className="ui-label leading-none mb-1">Time</p>
                                                <p className="ui-subtext text-sm leading-none">{booking.time}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100/50">
                                            <Calendar size={18} className="text-[#D4AF37]" />
                                            <div className="flex flex-col">
                                                <p className="ui-label leading-none mb-1">Date</p>
                                                <p className="ui-subtext text-sm leading-none">{new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PART 3: REMAINING THINGS (Right - Details Grid) */}
                                <div className="lg:w-[48%] bg-gray-50/50 rounded-[32px] p-6 lg:p-8 border border-gray-100/50 flex flex-col justify-center gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Column 1: Services */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100 shrink-0">
                                                <Scissors size={22} />
                                            </div>
                                            <div>
                                                <p className="ui-label leading-none mb-3">Services</p>
                                                <div className="flex flex-col gap-2">
                                                    {booking.serviceNames?.length > 0 ? (
                                                        booking.serviceNames.map((service, index) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0"></div>
                                                                <p className="ui-subtext text-sm leading-tight">{service}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="ui-subtext text-sm">Standard Salon Visit</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Stylist */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100 shrink-0">
                                                <User size={22} />
                                            </div>
                                            <div>
                                                <p className="ui-label leading-none mb-3">Stylist</p>
                                                <p className="ui-subtext text-sm leading-snug">
                                                    {booking.staff?.name || (typeof booking.staff === 'string' && booking.staff.length > 20 ? "Any Available Professional" : booking.staff || "Any Available Professional")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-200/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-[#D4AF37]/5 shrink-0">
                                                <Phone size={22} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="ui-label leading-none mb-1.5">Contact Support</p>
                                                <a href={`tel:${booking.salon?.contactNumber}`} className="text-base font-black text-[#1a1a1a] hover:text-[#D4AF37] transition-colors">
                                                    {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber || "N/A"}
                                                </a>
                                            </div>
                                        </div>

                                        <div className="shrink-0 pt-2 md:pt-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-[#D4AF37]/5 shrink-0">
                                                    <span className="text-xl font-bold">₹</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="ui-label leading-none mb-1.5">Total Paid</p>
                                                    <p className="text-xl font-black text-[#1a1a1a] tracking-tighter leading-none">
                                                        <span className="text-xl mr-1">₹</span>{booking.totalAmount}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cancellation Action */}
                                    {["pending", "pending_payment", "confirmed"].includes(booking.status) && (
                                        <div className="pt-4 border-t border-gray-200/50 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCancelModalBooking(booking);
                                                    setCancelError("");
                                                    setCancelReason("");
                                                }}
                                                className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
                                            >
                                                Cancel Appointment
                                            </button>
                                        </div>
                                    )}

                                    {/* Sprint 1.5: Book Again CTA — shown on completed or cancelled bookings */}
                                    {["completed", "cancelled"].includes(booking.status) && booking.salon?._id && (
                                        <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between gap-3">
                                            <p className="text-xs text-gray-400 font-medium">
                                                {booking.status === "completed" ? "Enjoyed your visit? Come back again!" : "Rebook this appointment"}
                                            </p>
                                            <button
                                                type="button"
                                                disabled={bookAgainLoading === booking._id}
                                                onClick={() => handleBookAgain(booking)}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-xs font-bold hover:bg-black transition-all active:scale-95 shadow-sm disabled:opacity-50 shrink-0"
                                            >
                                                {bookAgainLoading === booking._id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <RotateCcw size={13} className="text-[#D4AF37]" />
                                                )}
                                                Book Again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancellation Modal */}
            {cancelModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-serif font-bold text-gray-900">Cancel Appointment</h3>
                            <button
                                onClick={() => setCancelModalBooking(null)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4 p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-900 leading-relaxed">
                                <p className="font-semibold mb-1">Cancellation Policy</p>
                                <p>{cancelModalBooking.cancellationPolicySnapshot || cancelModalBooking.salon?.cancellationPolicy || "Free cancellation up to 24 hours before your appointment. A 20% fee applies thereafter."}</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to cancel your appointment at <strong>{cancelModalBooking.salon?.name}</strong> on <strong>{cancelModalBooking.date}</strong> at <strong>{cancelModalBooking.time}</strong>?
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Reason for cancellation (optional)
                            </label>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Schedule conflict, feeling unwell..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#D4AF37]"
                            />
                        </div>

                        {cancelError && (
                            <p className="text-xs text-red-500 mb-4">{cancelError}</p>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setCancelModalBooking(null)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Keep Appointment
                            </button>
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={handleConfirmCancel}
                                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {cancelling ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Cancelling...
                                    </>
                                ) : (
                                    "Confirm Cancellation"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
