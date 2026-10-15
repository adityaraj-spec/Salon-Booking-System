import { useEffect, useMemo, useState } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import {
    Calendar as CalendarIcon,
    Clock,
    User,
    Check,
    Sparkles,
    Scissors,
    Phone,
    ArrowLeft,
    Loader2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

const TIME_SLOTS = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
];

const loadRazorpay = () => new Promise((resolve, reject) => {
    if (window.Razorpay) {
        resolve(true);
        return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Unable to load the payment gateway.")), { once: true });
        return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load the payment gateway."));
    document.body.appendChild(script);
});

function CustomCalendar({ selectedDate, onDateSelect }) {
    const [viewDate, setViewDate] = useState(new Date());
    const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
    const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

    const isToday = (day) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        const sel = new Date(selectedDate);
        return sel.getDate() === day && sel.getMonth() === currentMonth && sel.getFullYear() === currentYear;
    };

    const isPast = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(currentYear, currentMonth, day);
        return current < today;
    };

    return (
        <div className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif font-bold text-lg text-gray-900">
                    {viewDate.toLocaleString('default', { month: 'long' })} {currentYear}
                </h3>
                <div className="flex gap-2">
                    <button aria-label="Previous month" onClick={prevMonth} className="p-2 min-w-10 min-h-10 hover:bg-gray-50 rounded-full transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button aria-label="Next month" onClick={nextMonth} className="p-2 min-w-10 min-h-10 hover:bg-gray-50 rounded-full transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const disabled = isPast(day);
                    return (
                        <button
                            key={day}
                            disabled={disabled}
                            onClick={() => {
                                const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                onDateSelect(formattedDate);
                            }}
                            aria-label={`${isToday(day) ? 'Today, ' : ''}${isSelected(day) ? 'Selected, ' : ''}${viewDate.toLocaleString('default', { month: 'long' })} ${day}, ${currentYear}`}
                            aria-pressed={isSelected(day)}
                            className={`
                                aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                                ${disabled ? "text-gray-200 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37]"}
                                ${isSelected(day) ? "bg-[#1a1a1a] text-white hover:bg-black hover:text-white" : ""}
                                ${isToday(day) && !isSelected(day) ? "border border-[#D4AF37] text-[#D4AF37]" : ""}
                            `}
                        >
                            {day}
                            {isToday(day) && !isSelected(day) && (
                                <span className="absolute bottom-1 w-1 h-1 bg-[#D4AF37] rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [salon, setSalon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [availability, setAvailability] = useState({});
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    
    // Real Data State
    const [services, setServices] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        const fetchSalonData = async () => {
            setLoading(true);
            try {
                // Fetch Salon Details, Services, and Staff in parallel
                const [salonRes, servicesRes, staffRes] = await Promise.all([
                    axiosInstance.get(`/salons/${id}`),
                    axiosInstance.get(`/services/salon/${id}`),
                    axiosInstance.get(`/staff/salon/${id}`)
                ]);

                if (salonRes.data.success) setSalon(salonRes.data.data);
                if (servicesRes.data.success) setServices(servicesRes.data.data);
                if (staffRes.data.success) setStaffMembers(staffRes.data.data);
                
            } catch {
                // silently fail - user will see empty state
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSalonData();
        }
    }, [id]);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!id || !date) return;
            setAvailabilityLoading(true);
            try {
                const response = await axiosInstance.get(`/bookings/availability/${id}`, {
                    params: { date, staffId: selectedStaff?._id }
                });
                if (response.data.success) {
                    const slots = response.data.data?.slots || [];
                    const slotAvailability = Object.fromEntries(slots.map((slot) => [
                        new Date(slot.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "UTC",
                        }),
                        slot.availableSeats,
                    ]));
                    setAvailability(slotAvailability);
                }
            } catch {
                // silently fail - slots will show as unavailable
            } finally {
                setAvailabilityLoading(false);
            }
        };

        fetchAvailability();
    }, [id, date, selectedStaff]);

    useEffect(() => {
        if (!id || !date) return undefined;
        const refreshTimer = window.setInterval(() => {
            axiosInstance.get(`/bookings/availability/${id}`, {
                params: { date, staffId: selectedStaff?._id },
            }).then((response) => {
                const slots = response.data.data?.slots || [];
                setAvailability(Object.fromEntries(slots.map((slot) => [
                    new Date(slot.startTime).toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC",
                    }),
                    slot.availableSeats,
                ])));
            }).catch(() => {});
        }, 5000);
        return () => window.clearInterval(refreshTimer);
    }, [id, date, selectedStaff]);

    const toggleService = (service) => {
        setSelectedServices(prev =>
            prev.find(s => s._id === service._id)
                ? prev.filter(s => s._id !== service._id)
                : [...prev, service]
        );
    };

    const totalAmount = useMemo(() =>
        selectedServices.reduce((sum, s) => sum + s.price, 0),
        [selectedServices]);

    const handleConfirm = async () => {
        if (selectedServices.length === 0 || !date || !time) {
            setBookingError("Please select at least one service, a date, and a time.");
            return;
        }
        setBookingLoading(true);
        setBookingError("");
        let pendingBookingId = null;
        let paymentVerified = false;

        // Generate fresh idempotency key per checkout attempt
        const idempotencyKey = crypto.randomUUID();

        try {
            // Step 1: Create 10-minute slot hold
            const holdResponse = await axiosInstance.post(
                "/bookings/hold",
                {
                    salonId: id,
                    services: selectedServices.map(s => s._id),
                    staff: selectedStaff?._id || null,
                    serviceNames: selectedServices.map(s => s.name),
                    staffName: selectedStaff?.name || "Any Available",
                    date,
                    time,
                    totalAmount,
                },
                {
                    headers: { "Idempotency-Key": idempotencyKey },
                    withCredentials: true,
                }
            );

            const holdData = holdResponse.data?.data;
            const holdId = holdData?._id;

            if (!holdId) {
                throw new Error("Failed to reserve slot hold.");
            }

            // Step 2: Convert the hold into a pending-payment booking
            const initiateResponse = await axiosInstance.post(
                "/bookings/initiate",
                { holdId },
                {
                    headers: { "Idempotency-Key": idempotencyKey },
                    withCredentials: true,
                }
            );

            const booking = initiateResponse.data?.data;
            const bookingId = booking?._id;
            pendingBookingId = bookingId;
            if (!initiateResponse.data?.success || !bookingId) {
                throw new Error("Unable to start payment for this reservation.");
            }

            // Step 3: Create the server-priced Razorpay order.
            const orderResponse = await axiosInstance.post("/payments/create-order", { bookingId });
            const order = orderResponse.data?.data;
            await loadRazorpay();

            await new Promise((resolve, reject) => {
                const checkout = new window.Razorpay({
                    key: order.keyId,
                    amount: Math.round(Number(order.amount) * 100),
                    currency: order.currency || "INR",
                    name: "SalonNow",
                    description: `Appointment at ${salon?.name || "SalonNow"}`,
                    order_id: order.orderId,
                    prefill: {
                        name: user?.fullName || "",
                        email: user?.email || "",
                        contact: user?.phonenumber || "",
                    },
                    theme: { color: "#D4AF37" },
                    handler: async (paymentResponse) => {
                        try {
                            paymentVerified = "pending";
                            await axiosInstance.post("/payments/verify", {
                                bookingId,
                                razorpayOrderId: paymentResponse.razorpay_order_id,
                                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                                razorpaySignature: paymentResponse.razorpay_signature,
                            });
                            paymentVerified = true;
                            resolve();
                        } catch (verificationError) {
                            reject(Object.assign(verificationError, { paymentVerificationPending: true }));
                        }
                    },
                    modal: {
                        ondismiss: () => reject(new Error("Payment was cancelled.")),
                    },
                });
                checkout.on("payment.failed", (paymentError) => reject(new Error(paymentError.error?.description || "Payment failed.")));
                checkout.open();
            });

            setBookingSuccess(true);
        } catch (err) {
            console.error("Booking error:", err);
            if (pendingBookingId && !paymentVerified && !err.paymentVerificationPending) {
                await axiosInstance.post(`/bookings/${pendingBookingId}/cancel-pending`).catch(() => {});
            }
            const status = err.response?.status;
            if (status === 409) {
                setBookingError("This slot or staff member is no longer available. Please select a different time or stylist.");
            } else {
                setBookingError(err.response?.data?.message || "Booking failed. Please try again.");
            }
        } finally {
            setBookingLoading(false);
        }
    };

    if (bookingSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
                <div className="max-w-md">
                    <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6">
                        <Check className="text-[#D4AF37] w-10 h-10" strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-3">Booking Confirmed!</h2>
                    <p className="text-gray-500 mb-2">Your appointment at <strong>{salon?.name}</strong> is all set.</p>
                    <p className="text-gray-400 text-sm mb-8">A confirmation email has been sent to your inbox.</p>
                    <NavLink to="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold tracking-widest text-sm uppercase hover:bg-black transition-colors">
                        Back to Home
                    </NavLink>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Setting up your booking experience...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-[#fafafa] font-sans">

            <main className="flex-1 pt-16">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 pb-12">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-6">
                    <NavLink to={`/shop/${id}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </NavLink>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a] leading-tight">Secure Your Appointment</h1>
                        <p className="ui-subtext mt-2 text-sm">
                            Experience the difference with SalonNow at <span className="text-[#D4AF37]">{salon?.name || "Glamour Studio"}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* LEFT COLUMN: SELECTIONS */}
                    <div className="lg:col-span-2 space-y-10">

                        {/* 1. Services Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">1</span>
                                <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Select Services</h2>
                            </div>
                            <div className="grid gap-2">
                                {services.length > 0 ? (
                                    services.map(service => (
                                        <button
                                            key={service._id}
                                            onClick={() => toggleService(service)}
                                            className={`group cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedServices.find(s => s._id === service._id)
                                                ? "border-[#D4AF37] bg-orange-50/30"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                            }`}
                                            aria-pressed={Boolean(selectedServices.find(s => s._id === service._id))}
                                            type="button"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-gray-900">{service.name}</h3>
                                                </div>
                                                <p className="ui-subtext line-clamp-1">{service.description}</p>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className={`font-bold transition-colors ${selectedServices.find(s => s._id === service._id) ? "text-[#D4AF37]" : "text-gray-900"
                                                    }`}>
                                                    ₹{service.price}
                                                </p>
                                                <div className={`mt-2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedServices.find(s => s._id === service._id)
                                                    ? "bg-[#D4AF37] border-[#D4AF37]"
                                                    : "border-gray-200"
                                                    }`}>
                                                    {selectedServices.find(s => s._id === service._id) && <Check size={12} className="text-white" />}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                                        No services available for this salon.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 2. Staff Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">2</span>
                                <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Choose Stylist (Optional)</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {staffMembers.length > 0 ? (
                                    staffMembers.map(staff => (
                                        <button
                                            key={staff._id}
                                            onClick={() => setSelectedStaff(selectedStaff?._id === staff._id ? null : staff)}
                                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all text-center ${selectedStaff?._id === staff._id
                                                ? "border-[#D4AF37] bg-orange-50/30 shadow-sm"
                                                : "border-gray-100 bg-white hover:border-gray-200"
                                            }`}
                                            aria-pressed={selectedStaff?._id === staff._id}
                                            type="button"
                                        >
                                            <div className="relative inline-block mb-3">
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-lg border-2 border-[#D4AF37]/20 mx-auto">
                                                    {staff.name?.charAt(0).toUpperCase()}
                                                </div>
                                                {selectedStaff?._id === staff._id && (
                                                    <div className="absolute -bottom-1 -right-1 bg-[#D4AF37] p-1 rounded-full text-white">
                                                        <Check size={10} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-xs md:text-sm truncate">{staff.name}</h3>
                                                <p className="ui-meta mt-0.5 truncate">{staff.role}</p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                        No specific stylists listed. We will assign an expert for you.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 3. Date & Time Section */}
                        <section className="grid md:grid-cols-2 gap-10 md:gap-8">
                            <div className="bg-white rounded-[24px] p-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">3</span>
                                    <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Pick a Date</h2>
                                </div>
                                <CustomCalendar 
                                    selectedDate={date} 
                                    onDateSelect={(newDate) => setDate(newDate)} 
                                />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">4</span>
                                    <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Select Time</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 relative">
                                    {availabilityLoading && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                                            <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
                                        </div>
                                    )}
                                    {TIME_SLOTS.map(t => {
                                        const totalSeats = salon?.totalSeats || 6;
                                        const seatsLeft = Math.max(0, availability[t] ?? totalSeats);
                                        const isFull = seatsLeft <= 0;

                                        return (
                                            <button
                                                key={t}
                                                disabled={isFull || !date}
                                                onClick={() => setTime(t)}
                                                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                                                    time === t
                                                    ? "bg-[#1a1a1a] text-white shadow-md"
                                                    : isFull
                                                        ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                                        : !date
                                                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                                            : "bg-white text-gray-600 border border-gray-100 hover:border-gray-200"
                                                }`}
                                            >
                                                <span>{t}</span>
                                                {date && !isFull && (
                                                    <span className={`text-sm font-normal ${time === t ? "text-[#D4AF37]" : "text-green-500"}`}>
                                                        {seatsLeft} available
                                                    </span>
                                                )}
                                                {date && isFull && (
                                                    <span className="text-sm font-normal text-red-500">
                                                        FULL
                                                    </span>
                                                )}
                                                {!date && (
                                                    <span className="ui-meta text-xs italic">
                                                        Pick Date
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: BOOKING SUMMARY */}
                    <div className="lg:col-span-1 order-first lg:order-last">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 lg:sticky lg:top-28 shadow-sm">
                            <h2 className="text-lg font-serif font-bold text-[#1a1a1a] mb-6 border-b border-gray-50 pb-4">Booking Summary</h2>

                            <div className="space-y-4 mb-8">
                                {selectedServices.length > 0 ? (
                                    selectedServices.map(s => (
                                        <div key={s._id} className="flex justify-between items-start text-sm">
                                            <span className="text-gray-600">{s.name}</span>
                                            <span className="font-bold text-gray-900">₹{s.price}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No services selected yet</p>
                                )}
                            </div>

                            {selectedStaff && (
                                <div className="mb-8 pt-4 border-t border-gray-50">
                                    <p className="ui-label mb-2">Your Stylist</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-sm border border-[#D4AF37]/20">
                                            {selectedStaff.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{selectedStaff.name}</span>
                                    </div>
                                </div>
                            )}

                            {(date || time) && (
                                <div className="mb-8 pt-4 border-t border-gray-50 space-y-2">
                                    {date && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CalendarIcon size={14} />
                                            <span>{new Date(date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                    {time && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock size={14} />
                                            <span>{time}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-6 border-t border-gray-100 mt-6">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-lg font-bold text-[#1a1a1a]">Total</span>
                                    <span className="text-2xl font-serif font-bold text-[#e65c00]">₹{totalAmount}</span>
                                </div>
                                {bookingError && (
                                    <p className="text-red-500 text-sm mb-3 text-center">{bookingError}</p>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                    disabled={selectedServices.length === 0 || !date || !time || bookingLoading}
                                >
                                    {bookingLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
                                    ) : (
                                        <>Confirm Reservation <ChevronRight size={18} /></>
                                    )}
                                </button>
                                <p className="ui-subtext text-center mt-4">
                                    Secure payment is required to confirm your reservation.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
                </div>
            </main>
        </div>
    );
}
