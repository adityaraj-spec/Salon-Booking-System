import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { SalonDashboardSkeleton } from "../components/skeletons/index.jsx";
import {
    Clock,
    User,
    CheckCircle,
    XCircle,
    Loader2,
    Scissors,
    Phone,
    Mail,
    ChevronDown,
    Plus,
    X,
    Banknote,
    CreditCard,
    Smartphone,
    Users,
    PauseCircle,
    PlayCircle,
    AlertCircle,
    KeyRound,
    MapPin,
    Calendar,
    Receipt
} from "lucide-react";

const loadRazorpay = () =>
    new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(true), { once: true });
            existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay payment gateway.")), { once: true });
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error("Unable to load Razorpay payment gateway."));
        document.body.appendChild(script);
    });

export function SalonBookingsPage() {
    useDocumentTitle('Salon Owner Dashboard', 'Real-time queue requests, appointment tracking, and checkout for salon owners.');
    const { showNotification } = useNotification();
    const socket = useSocket();

    const [bookings, setBookings] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [queueSummary, setQueueSummary] = useState(null);
    const [salonId, setSalonId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("queue"); // "queue" | "requests" | "history"

    const [cardCheckInPins, setCardCheckInPins] = useState({});
    const [cardCheckInLoading, setCardCheckInLoading] = useState({});
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Extra services state
    const [extraServiceModalBooking, setExtraServiceModalBooking] = useState(null);
    const [selectedExtraServiceId, setSelectedExtraServiceId] = useState("");
    const [extraServiceLoading, setExtraServiceLoading] = useState(false);

    const [serviceOptions, setServiceOptions] = useState([]);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const getDisplayStylist = (item) => {
        const raw = item?.staff?.name || item?.staffName;
        if (!raw || typeof raw !== "string" || raw.toLowerCase().trim() === "stylist assigned" || raw.toLowerCase().trim() === "not specified") {
            return null;
        }
        return raw;
    };

    const fetchSalonAndQueue = useCallback(async () => {
        try {
            const bookingsRes = await axiosInstance.get("/bookings/salon-bookings");
            const list = bookingsRes.data.data?.bookings || bookingsRes.data.data || [];
            const bookingList = Array.isArray(list) ? list : [];
            setBookings(bookingList);

            const discoveredSalonId = bookingList.find((b) => b.salon?._id || b.salon)?.salon?._id ||
                bookingList.find((b) => b.salon?._id || b.salon)?.salon;

            if (discoveredSalonId) {
                setSalonId(discoveredSalonId);

                const [queueRes, requestsRes, servicesRes] = await Promise.all([
                    axiosInstance.get(`/queue/salon/${discoveredSalonId}`).catch(() => null),
                    axiosInstance.get(`/queue/salon/${discoveredSalonId}/requests`).catch(() => null),
                    axiosInstance.get(`/services/salon/${discoveredSalonId}`).catch(() => null),
                ]);

                if (queueRes?.data?.success) {
                    setQueueSummary(queueRes.data.data?.summary);
                }
                if (requestsRes?.data?.success) {
                    setIncomingRequests(requestsRes.data.data || []);
                }
                if (servicesRes?.data?.success) {
                    setServiceOptions(servicesRes.data.data || []);
                }
            }
        } catch (err) {
            console.error("Failed to fetch salon queue data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSalonAndQueue();
    }, [fetchSalonAndQueue]);

    // Socket real-time synchronization
    useEffect(() => {
        if (!socket) return undefined;

        const handleRealtimeUpdate = () => {
            fetchSalonAndQueue();
        };

        socket.on("queue:request_created", (data) => {
            showNotification(`New queue request from ${data.customerName || "a customer"}!`, "info");
            fetchSalonAndQueue();
        });

        socket.on("queue:request_accepted", handleRealtimeUpdate);
        socket.on("queue:request_rejected", handleRealtimeUpdate);
        socket.on("queue:service_started", handleRealtimeUpdate);
        socket.on("queue:service_completed", handleRealtimeUpdate);
        socket.on("queue:customer_cancelled", handleRealtimeUpdate);
        socket.on("queue:grace_expired", handleRealtimeUpdate);

        return () => {
            socket.off("queue:request_created");
            socket.off("queue:request_accepted");
            socket.off("queue:request_rejected");
            socket.off("queue:service_started");
            socket.off("queue:service_completed");
            socket.off("queue:customer_cancelled");
            socket.off("queue:grace_expired");
        };
    }, [socket, fetchSalonAndQueue, showNotification]);

    // Pause / Resume Queue
    const handleTogglePause = async () => {
        if (!salonId) return;
        const willPause = !queueSummary?.isPaused;
        try {
            await axiosInstance.patch(`/queue/salon/${salonId}/settings`, {
                isPaused: willPause,
            });
            showNotification(willPause ? "Line paused for walk-ins" : "Line resumed and accepting customers", "info");
            await fetchSalonAndQueue();
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to toggle queue pause", "error");
        }
    };

    // Accept incoming request
    const handleAcceptRequest = async (bookingId) => {
        setActionLoadingId(bookingId);
        try {
            const res = await axiosInstance.post(`/queue/${bookingId}/accept`);
            if (res.data?.success) {
                showNotification("Customer accepted into the queue!", "success");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to accept request", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Reject incoming request
    const handleRejectRequest = async (bookingId) => {
        setActionLoadingId(bookingId);
        try {
            const res = await axiosInstance.post(`/queue/${bookingId}/reject`, {
                reason: "Salon is at capacity at this time.",
            });
            if (res.data?.success) {
                showNotification("Request declined.", "info");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to decline request", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Start service with 4-digit PIN verification
    const handleStartService = async (e, booking) => {
        e.preventDefault();
        const pin = (cardCheckInPins[booking._id] || "").trim();
        if (!pin || pin.length !== 4) {
            showNotification("Enter customer's 4-digit booking code", "error");
            return;
        }

        setCardCheckInLoading((prev) => ({ ...prev, [booking._id]: true }));
        try {
            const res = await axiosInstance.post(`/queue/${booking._id}/start`, { pin });
            if (res.data?.success) {
                showNotification("PIN verified! Service started.", "success");
                setCardCheckInPins((prev) => ({ ...prev, [booking._id]: "" }));
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Invalid PIN", "error");
        } finally {
            setCardCheckInLoading((prev) => ({ ...prev, [booking._id]: false }));
        }
    };

    // Complete Service and record payment (Razorpay for UPI, Direct for Cash)
    const handleCompleteService = async () => {
        if (!paymentBooking) return;
        setPaymentLoading(true);

        try {
            if (paymentMethod === "upi" || paymentMethod === "card") {
                // Step 1: Create server-priced Razorpay order
                const orderRes = await axiosInstance.post("/payments/create-order", {
                    bookingId: paymentBooking._id,
                });
                const orderData = orderRes.data?.data;
                if (!orderData?.orderId) {
                    throw new Error("Unable to create online payment order.");
                }

                // Step 2: Dynamically load Razorpay SDK
                await loadRazorpay();

                // Step 3: Open Razorpay checkout interface
                await new Promise((resolve, reject) => {
                    const rzp = new window.Razorpay({
                        key: orderData.keyId,
                        amount: Math.round(Number(orderData.amount) * 100),
                        currency: orderData.currency || "INR",
                        name: "SalonNow",
                        description: `Payment for #${paymentBooking._id.slice(-6)}`,
                        order_id: orderData.orderId,
                        prefill: {
                            name: paymentBooking.customer?.fullName || paymentBooking.guestName || "Customer",
                            email: paymentBooking.customer?.email || "",
                            contact: paymentBooking.customer?.phonenumber || "",
                        },
                        theme: { color: "#D4AF37" },
                        handler: async (response) => {
                            try {
                                // Step 4: Verify signature
                                await axiosInstance.post("/payments/verify", {
                                    bookingId: paymentBooking._id,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature,
                                });

                                // Step 5: Mark complete
                                await axiosInstance.post(`/queue/${paymentBooking._id}/complete`, {
                                    paymentMethod,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                });

                                showNotification("UPI Payment verified & service completed!", "success");
                                resolve();
                            } catch (vErr) {
                                reject(vErr);
                            }
                        },
                        modal: {
                            ondismiss: () => {
                                reject(new Error("Payment was cancelled or closed."));
                            },
                        },
                    });

                    rzp.on("payment.failed", (pErr) => {
                        reject(new Error(pErr.error?.description || "Payment failed"));
                    });

                    rzp.open();
                });

                setPaymentBooking(null);
                await fetchSalonAndQueue();
            } else {
                // Cash settlement
                const res = await axiosInstance.post(`/queue/${paymentBooking._id}/complete`, { paymentMethod: "cash" });
                if (res.data?.success) {
                    showNotification("Cash payment recorded & service completed!", "success");
                    setPaymentBooking(null);
                    await fetchSalonAndQueue();
                }
            }
        } catch (err) {
            showNotification(err.response?.data?.message || err.message || "Failed to complete service", "error");
        } finally {
            setPaymentLoading(false);
        }
    };

    // Direct completion without Razorpay (fallback for physical standee QR)
    const handleDirectComplete = async () => {
        if (!paymentBooking) return;
        setPaymentLoading(true);
        try {
            const res = await axiosInstance.post(`/queue/${paymentBooking._id}/complete`, { paymentMethod });
            if (res.data?.success) {
                showNotification(`Payment recorded via ${paymentMethod.toUpperCase()} and ticket closed!`, "success");
                setPaymentBooking(null);
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to record payment", "error");
        } finally {
            setPaymentLoading(false);
        }
    };

    // Add extra service to booking
    const handleAddExtraServiceSubmit = async () => {
        if (!extraServiceModalBooking || !selectedExtraServiceId) return;
        setExtraServiceLoading(true);
        try {
            const res = await axiosInstance.patch(`/bookings/${extraServiceModalBooking._id}/services`, {
                serviceId: selectedExtraServiceId,
            });
            if (res.data?.success) {
                showNotification("Service added successfully and price updated!", "success");
                setExtraServiceModalBooking(null);
                setSelectedExtraServiceId("");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to add service", "error");
        } finally {
            setExtraServiceLoading(false);
        }
    };

    // Filter active queue entries vs history
    const activeQueueList = bookings.filter((b) =>
        ["waiting", "accepted", "arrived", "ready_to_start", "in_progress"].includes(b.status)
    ).sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        return (a.queuePosition || 99) - (b.queuePosition || 99);
    });

    const historicalList = bookings.filter((b) =>
        ["completed", "cancelled", "rejected", "expired"].includes(b.status)
    );

    if (loading) {
        return <SalonDashboardSkeleton />;
    }

    return (
        <div className="min-h-screen bg-[#fafafa] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="space-y-6">

                {/* HEADER & QUEUE STATUS BAR */}
                <div className="bg-white rounded-xl p-6 md:p-8 border border-stone-200/50 shadow-soft-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                                Live Shop Status & Line Manager
                            </h1>
                            <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border shadow-soft-xs ${
                                queueSummary?.isPaused
                                    ? "bg-amber-50 text-amber-800 border-amber-200/80"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${queueSummary?.isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
                                <span>{queueSummary?.isPaused ? "Line Paused" : "Active & Accepting"}</span>
                            </span>
                        </div>
                        <p className="text-xs text-stone-500 font-medium mt-1.5 leading-relaxed">
                            Manage live visitor check-ins, active appointments, and status
                        </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Queue Stats Chips */}
                        <div className="flex items-center gap-3 bg-stone-50/80 border border-stone-200/50 px-4 py-2.5 rounded-xl shadow-soft-xs">
                            <Users size={18} className="text-[#D4AF37]" />
                            <div className="text-left">
                                <p className="text-[11px] font-semibold text-gray-500 leading-none">People in Line / Max Spots</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">
                                    {queueSummary?.waitingCount || activeQueueList.length} / {queueSummary?.maxCapacity || 10}
                                </p>
                            </div>
                        </div>

                        {/* Pause / Resume Button */}
                        <button
                            onClick={handleTogglePause}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] shadow-soft-xs ${
                                queueSummary?.isPaused
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-amber-100 hover:bg-amber-200 text-amber-900"
                            }`}
                        >
                            {queueSummary?.isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                            <span>{queueSummary?.isPaused ? "Resume Line" : "Pause Line"}</span>
                        </button>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex items-center gap-3 border-b border-stone-200/50 pb-2.5">
                    <button
                        onClick={() => setActiveTab("queue")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] flex items-center gap-2 ${
                            activeTab === "queue"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                        <Users size={16} />
                        <span>Current Line ({activeQueueList.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("requests")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] flex items-center gap-2 relative ${
                            activeTab === "requests"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                        <Clock size={16} />
                        <span>Pending Requests ({incomingRequests.length})</span>
                        {incomingRequests.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-1 right-1"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] flex items-center gap-2 ${
                            activeTab === "history"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                        <CheckCircle size={16} />
                        <span>Completed & History ({historicalList.length})</span>
                    </button>
                </div>

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* TAB 1: ACTIVE QUEUE */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                {activeTab === "queue" && (
                    <div className="space-y-4">
                        {activeQueueList.length === 0 ? (
                            <div className="bg-white rounded-xl py-10 md:py-12 px-6 text-center border border-gray-100 shadow-sm">
                                <Users size={32} className="text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-sans font-semibold text-gray-900">The Line is Currently Empty</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">New customers requesting service will appear here once accepted.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {activeQueueList.map((booking) => {
                                    const isInProgress = booking.status === "in_progress";
                                    const isArrived = booking.status === "arrived";

                                    return (
                                        <div
                                            key={booking._id}
                                            className={`bg-white rounded-xl p-6 md:p-8 border transition-all duration-200 shadow-soft-sm hover:shadow-soft-md hover:scale-[1.006] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
                                                isInProgress
                                                    ? "border-purple-200/80 bg-purple-50/15"
                                                    : isArrived
                                                    ? "border-emerald-200/80 bg-emerald-50/15"
                                                    : "border-stone-200/60"
                                            }`}
                                        >
                                            {/* LEFT: Queue Position Badge & Customer Info */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                                                    isInProgress
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : isArrived
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-amber-50 text-[#D4AF37] border-amber-200"
                                                }`}>
                                                    <span className="text-[11px] font-bold leading-none">Line</span>
                                                    <span className="text-xl font-black font-sans leading-tight">
                                                        #{booking.queuePosition || 1}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2.5">
                                                        <h3 className="font-semibold text-gray-900 text-base">
                                                            {booking.customer?.fullName || booking.guestName || "Customer"}
                                                        </h3>
                                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border shadow-soft-xs ${
                                                            isInProgress
                                                                ? "bg-purple-50 text-purple-700 border-purple-200/80"
                                                                : isArrived
                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                                                : "bg-blue-50 text-blue-700 border-blue-200/80"
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isInProgress ? "bg-purple-500 animate-pulse" : isArrived ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
                                                            <span>{isInProgress ? "In Service" : isArrived ? "Arrived & Waiting" : "En Route / Waiting"}</span>
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                        {booking.customer?.phonenumber && (
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone size={12} /> {booking.customer.phonenumber}
                                                            </span>
                                                        )}
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} /> ~{booking.estimatedWaitMin || 0}m wait
                                                        </span>
                                                        <span>•</span>
                                                        <span className="font-bold text-gray-900">
                                                            Total: ₹{booking.totalAmount}
                                                        </span>
                                                        {getDisplayStylist(booking) && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1 text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
                                                                    <Scissors size={11} /> Stylist: {getDisplayStylist(booking)}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Services list */}
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                                        {booking.serviceNames?.map((s, i) => (
                                                            <span key={i} className="text-[11px] bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg text-gray-700 font-medium">
                                                                {s}
                                                            </span>
                                                        ))}

                                                        {/* Add Service Button on Active Card */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExtraServiceModalBooking(booking);
                                                                setSelectedExtraServiceId("");
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-lg transition-colors"
                                                        >
                                                            <Plus size={11} />
                                                            <span>Add Service</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT: Actions (Start Service / Complete Service / PIN) */}
                                            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                                                {!isInProgress ? (
                                                    <form
                                                        onSubmit={(e) => handleStartService(e, booking)}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            maxLength={4}
                                                            placeholder="Booking Code"
                                                            value={cardCheckInPins[booking._id] || ""}
                                                            onChange={(e) =>
                                                                setCardCheckInPins((prev) => ({
                                                                    ...prev,
                                                                    [booking._id]: e.target.value.replace(/\D/g, ""),
                                                                }))
                                                            }
                                                            className="w-28 px-3 py-2 text-center font-mono font-bold text-sm tracking-pin border border-stone-200/80 rounded-lg focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={cardCheckInLoading[booking._id]}
                                                            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-glow-gold flex items-center gap-1.5 shrink-0 shadow-soft-sm"
                                                        >
                                                            {cardCheckInLoading[booking._id] ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Scissors size={14} />
                                                            )}
                                                            <span>Start Service</span>
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setPaymentBooking(booking)}
                                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 shadow-soft-sm"
                                                        >
                                                            <CheckCircle size={14} />
                                                            <span>Complete Service (₹{booking.totalAmount})</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* TAB 2: INCOMING QUEUE REQUESTS */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                {activeTab === "requests" && (
                    <div className="space-y-4">
                        {incomingRequests.length === 0 ? (
                            <div className="bg-white rounded-xl py-10 md:py-12 px-6 text-center border border-gray-100 shadow-sm">
                                <Clock size={32} className="text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-sans font-semibold text-gray-900">No Pending Requests</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">When customers request queue entry, they will appear here for review.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {incomingRequests.map((req) => (
                                    <div
                                        key={req._id}
                                        className="bg-white rounded-xl p-6 md:p-8 border border-amber-200/70 bg-gradient-to-r from-amber-50/30 via-white to-white shadow-soft-sm hover:shadow-soft-md hover:scale-[1.006] transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-gray-900 text-lg">
                                                    {req.customer?.fullName || req.guestName || "Customer"}
                                                </h3>
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-soft-xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    <span>Pending Review</span>
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span>Total Amount: <strong>₹{req.totalAmount}</strong></span>
                                                <span>•</span>
                                                <span>Est. Duration: <strong>{req.durationMinutes || 30} mins</strong></span>
                                                {getDisplayStylist(req) && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1 text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
                                                            <Scissors size={11} /> Stylist: {getDisplayStylist(req)}
                                                        </span>
                                                    </>
                                                )}
                                            </p>

                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {req.services?.map((s, i) => (
                                                    <span key={i} className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-lg font-medium text-gray-700">
                                                        {s.name || "Service"}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <button
                                                disabled={actionLoadingId === req._id}
                                                onClick={() => handleRejectRequest(req._id)}
                                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-red-200/80 text-red-600 hover:bg-red-50 text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                disabled={actionLoadingId === req._id}
                                                onClick={() => handleAcceptRequest(req._id)}
                                                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-white text-xs font-bold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-glow-gold flex items-center justify-center gap-1.5 shadow-soft-sm"
                                            >
                                                {actionLoadingId === req._id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle size={14} />
                                                )}
                                                <span>Accept Booking</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* TAB 3: COMPLETED & HISTORY */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                {activeTab === "history" && (
                    <div className="space-y-4">
                        {historicalList.length === 0 ? (
                            <div className="bg-white rounded-xl py-10 md:py-12 px-6 text-center border border-gray-100 shadow-sm">
                                <CheckCircle size={32} className="text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-sans font-semibold text-gray-900">No Historical Records</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">Completed appointments will be archived here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {historicalList.map((b) => {
                                    const formattedDate = b.completedAt
                                        ? new Date(b.completedAt).toLocaleString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                          })
                                        : b.createdAt
                                        ? new Date(b.createdAt).toLocaleString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                          })
                                        : "Recent";

                                    const paymentMethodLabel =
                                        b.paymentMethod === "upi"
                                            ? "UPI (Razorpay)"
                                            : b.paymentMethod === "card"
                                            ? "Card"
                                            : "Cash";

                                    const PaymentIcon =
                                        b.paymentMethod === "upi"
                                            ? Smartphone
                                            : b.paymentMethod === "card"
                                            ? CreditCard
                                            : Banknote;

                                    const stylistName = getDisplayStylist(b) || "First Available";

                                    return (
                                        <div
                                            key={b._id}
                                            className="bg-white rounded-xl p-6 md:p-8 border border-stone-200/50 shadow-soft-sm hover:shadow-soft-md hover:scale-[1.006] transition-all duration-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                                        >
                                            {/* LEFT: Customer & Appointment Details */}
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                                                        {b.customer?.fullName || b.guestName || "Guest Customer"}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border shadow-soft-xs ${
                                                        b.status === "completed"
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                                            : "bg-stone-100 text-stone-600 border-stone-200"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === "completed" ? "bg-emerald-500" : "bg-stone-400"}`} />
                                                        <span>{b.status === "completed" ? "Completed" : b.status}</span>
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                                                        <Calendar size={13} className="text-[#D4AF37]" />
                                                        {formattedDate}
                                                    </span>

                                                    <span className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md font-medium">
                                                        <Scissors size={12} />
                                                        Stylist: {stylistName}
                                                    </span>

                                                    {b.customer?.phonenumber && (
                                                        <span className="flex items-center gap-1 font-mono text-gray-500">
                                                            <Phone size={12} /> {b.customer.phonenumber}
                                                        </span>
                                                    )}

                                                    
                                                </div>

                                                {/* Selected Services Tags */}
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-semibold text-gray-400 mb-1.5">Services Rendered</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(b.snapshotServices?.length > 0
                                                            ? b.snapshotServices
                                                            : b.services?.length > 0
                                                            ? b.services
                                                            : (b.serviceNames || []).map((name) => ({ name, price: "" }))
                                                        ).map((s, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="text-xs bg-gray-50 border border-gray-200/80 px-3 py-1 rounded-lg text-gray-700 font-medium flex items-center gap-1.5"
                                                            >
                                                                <span>{s.name || s}</span>
                                                                {s.price ? (
                                                                    <span className="font-bold text-gray-900 text-[11px]">₹{s.price}</span>
                                                                ) : null}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT: Payment Method & Total Settled Amount */}
                                            <div className="w-full lg:w-auto flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                        <PaymentIcon size={13} className="text-[#D4AF37]" />
                                                        <span>{paymentMethodLabel}</span>
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Paid
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-[10px] font-semibold text-gray-400">Total Bill</p>
                                                    <p className="text-2xl font-black font-sans text-gray-900">₹{b.totalAmount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* PAYMENT & SETTLEMENT MODAL */}
            {paymentBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 md:p-8 shadow-soft-xl border border-stone-200/50 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-sans font-bold text-gray-900">Complete & Settle Service</h3>
                                <p className="text-xs text-gray-500 mt-1">Select payment method and close out ticket</p>
                            </div>
                            <button onClick={() => setPaymentBooking(null)} className="p-1 rounded-full text-gray-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div>
                                <span className="text-xs text-gray-500 block">Customer</span>
                                <span className="text-sm font-bold text-gray-900">{paymentBooking.customer?.fullName || paymentBooking.guestName || "Customer"}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 block">Total Bill</span>
                                <span className="text-2xl font-black font-sans text-gray-900">₹{paymentBooking.totalAmount}</span>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <label className="text-xs font-bold text-gray-700">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "upi", label: "UPI (Razorpay)", icon: Smartphone },
                                    { id: "cash", label: "Cash", icon: Banknote },
                                    { id: "card", label: "Card", icon: CreditCard },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setPaymentMethod(m.id)}
                                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                                            paymentMethod === m.id
                                                ? "border-[#D4AF37] bg-amber-50/70 text-[#1a1a1a] font-bold shadow-sm"
                                                : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        <m.icon size={18} className={paymentMethod === m.id ? "text-[#D4AF37]" : "text-gray-400"} />
                                        <span className="text-xs leading-tight">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                            {paymentMethod === "upi" && (
                                <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 mt-2">
                                    Clicking Confirm will launch the <strong>Razorpay UPI interface</strong> for dynamic QR code scan or UPI apps.
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentBooking(null)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={paymentLoading}
                                    onClick={handleCompleteService}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                                >
                                    {paymentLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    <span>{paymentMethod === "upi" ? "Open Razorpay UPI" : "Confirm Payment"}</span>
                                </button>
                            </div>

                            {paymentMethod === "upi" && (
                                <button
                                    type="button"
                                    disabled={paymentLoading}
                                    onClick={handleDirectComplete}
                                    className="w-full text-center text-[11px] text-gray-500 hover:text-black font-medium underline py-1"
                                >
                                    Or mark as paid directly (Scanned physical counter QR standee)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD EXTRA SERVICES MODAL */}
            {extraServiceModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl max-lg w-full p-6 md:p-8 shadow-soft-xl border border-stone-200/50 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-sans font-bold text-gray-900">Add Service to Ticket</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Customer: <strong>{extraServiceModalBooking.customer?.fullName || extraServiceModalBooking.guestName || "Customer"}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setExtraServiceModalBooking(null)}
                                className="p-1 rounded-full text-gray-400 hover:text-black"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Current services on ticket */}
                        <div className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                            <span className="font-semibold text-gray-500 block mb-1">Current Ticket Services:</span>
                            <div className="flex flex-wrap gap-1">
                                {extraServiceModalBooking.serviceNames?.map((s, idx) => (
                                    <span key={idx} className="bg-white border border-gray-200 px-2.5 py-0.5 rounded-md font-medium text-gray-700">
                                        {s}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                <span>Current Total:</span>
                                <span>₹{extraServiceModalBooking.totalAmount}</span>
                            </div>
                        </div>

                        {/* Salon's available services list */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-700 block mb-2">
                                Choose an Available Salon Service to Add:
                            </label>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {serviceOptions.length > 0 ? (
                                    serviceOptions.map((service) => {
                                        const isSelected = selectedExtraServiceId === service._id;
                                        return (
                                            <button
                                                key={service._id}
                                                type="button"
                                                onClick={() => setSelectedExtraServiceId(service._id)}
                                                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                    isSelected
                                                        ? "border-[#D4AF37] bg-amber-50/70 text-gray-900 font-bold shadow-sm ring-1 ring-[#D4AF37]/30"
                                                        : "border-gray-100 hover:border-gray-200 bg-white"
                                                }`}
                                            >
                                                <div>
                                                    <span className="text-sm font-semibold block">{service.name}</span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} className="text-[#D4AF37]" />
                                                        ~{service.durationMin || service.duration || 30} mins
                                                    </span>
                                                </div>
                                                <div className="text-right flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900">+₹{service.price}</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        isSelected ? "bg-[#D4AF37] border-[#D4AF37] text-white" : "border-gray-300"
                                                    }`}>
                                                        {isSelected && <CheckCircle size={10} />}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-gray-400 py-4 text-center">No other services configured for this salon.</p>
                                )}
                            </div>
                        </div>

                        {/* Price increment summary */}
                        {selectedExtraServiceId && (
                            <div className="mb-6 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                                {(() => {
                                    const selectedService = serviceOptions.find((s) => s._id === selectedExtraServiceId);
                                    const addedPrice = Number(selectedService?.price || 0);
                                    const newTotal = Number(extraServiceModalBooking.totalAmount || 0) + addedPrice;
                                    return (
                                        <div className="flex justify-between items-center text-sm font-bold text-amber-950">
                                            <span>New Total Bill:</span>
                                            <span className="text-lg font-black text-amber-900">₹{newTotal}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setExtraServiceModalBooking(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!selectedExtraServiceId || extraServiceLoading}
                                onClick={handleAddExtraServiceSubmit}
                                className={`flex-1 py-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md ${
                                    selectedExtraServiceId && !extraServiceLoading
                                        ? "bg-[#D4AF37] hover:bg-[#B8962E]"
                                        : "bg-gray-300 cursor-not-allowed shadow-none"
                                }`}
                            >
                                {extraServiceLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                <span>Add to Ticket</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalonBookingsPage;

