import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";
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
    MapPin
} from "lucide-react";

export function SalonBookingsPage() {
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

    const [serviceOptions, setServiceOptions] = useState([]);
    const [selectedServiceByBooking, setSelectedServiceByBooking] = useState({});
    const [actionLoadingId, setActionLoadingId] = useState(null);

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
        socket.on("queue:customer_arrived", (data) => {
            showNotification(`Customer #${data.queuePosition} has arrived at the salon!`, "info");
            fetchSalonAndQueue();
        });
        socket.on("queue:request_accepted", handleRealtimeUpdate);
        socket.on("queue:request_rejected", handleRealtimeUpdate);
        socket.on("queue:request_expired", handleRealtimeUpdate);
        socket.on("queue:service_started", handleRealtimeUpdate);
        socket.on("queue:service_completed", handleRealtimeUpdate);
        socket.on("queue:updated", handleRealtimeUpdate);
        socket.on("queue:settings_updated", handleRealtimeUpdate);

        return () => {
            socket.off("queue:request_created", handleRealtimeUpdate);
            socket.off("queue:customer_arrived", handleRealtimeUpdate);
            socket.off("queue:request_accepted", handleRealtimeUpdate);
            socket.off("queue:request_rejected", handleRealtimeUpdate);
            socket.off("queue:request_expired", handleRealtimeUpdate);
            socket.off("queue:service_started", handleRealtimeUpdate);
            socket.off("queue:service_completed", handleRealtimeUpdate);
            socket.off("queue:updated", handleRealtimeUpdate);
            socket.off("queue:settings_updated", handleRealtimeUpdate);
        };
    }, [socket, fetchSalonAndQueue, showNotification]);

    // Accept queue request
    const handleAcceptRequest = async (bookingId) => {
        setActionLoadingId(bookingId);
        try {
            const res = await axiosInstance.post(`/queue/${bookingId}/accept`);
            if (res.data?.success) {
                showNotification(`Request accepted into queue (Position #${res.data.data.queuePosition})`, "success");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to accept request", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Reject queue request
    const handleRejectRequest = async (bookingId) => {
        setActionLoadingId(bookingId);
        try {
            const res = await axiosInstance.post(`/queue/${bookingId}/reject`, {
                reason: "Salon currently at capacity",
            });
            if (res.data?.success) {
                showNotification("Request declined", "info");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to decline request", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Toggle Pause / Resume Queue
    const handleTogglePause = async () => {
        if (!salonId) return;
        const currentPaused = Boolean(queueSummary?.isPaused);
        try {
            const res = await axiosInstance.patch(`/queue/salon/${salonId}/settings`, {
                isPaused: !currentPaused,
            });
            if (res.data?.success) {
                showNotification(currentPaused ? "Queue intake resumed" : "Queue intake paused", "success");
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification("Failed to update queue settings", "error");
        }
    };

    // Start Service with PIN verification
    const handleStartService = async (event, booking) => {
        event.preventDefault();
        const pin = String(cardCheckInPins[booking._id] || "").trim();
        if (!/^\d{4}$/.test(pin)) {
            showNotification("Please enter customer's 4-digit PIN", "error");
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

    // Complete Service and record payment
    const handleCompleteService = async () => {
        if (!paymentBooking) return;
        setPaymentLoading(true);
        try {
            const res = await axiosInstance.post(`/queue/${paymentBooking._id}/complete`, { paymentMethod });
            if (res.data?.success) {
                showNotification("Payment recorded and service marked completed!", "success");
                setPaymentBooking(null);
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || "Failed to complete service", "error");
        } finally {
            setPaymentLoading(false);
        }
    };

    // Add extra service
    const handleAddExtra = async (booking) => {
        const serviceId = String(selectedServiceByBooking[booking._id] || "").trim();
        if (!serviceId) return;
        try {
            const res = await axiosInstance.patch(`/bookings/${booking._id}/services`, { serviceId });
            if (res.data?.success) {
                showNotification("Extra service added to bill", "success");
                setSelectedServiceByBooking((prev) => ({ ...prev, [booking._id]: "" }));
                await fetchSalonAndQueue();
            }
        } catch (err) {
            showNotification("Failed to add extra service", "error");
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
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Loading live queue dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1280px] mx-auto space-y-8">

                {/* HEADER & QUEUE STATUS BAR */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-serif font-black text-[#1a1a1a]">Live Salon Queue Dashboard</h1>
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                                queueSummary?.isPaused
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                                {queueSummary?.isPaused ? "Queue Intake Paused" : "Active & Accepting"}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1.5">
                            Real-time customer admissions, stylist assignments & PIN check-ins
                        </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Queue Stats Chips */}
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl">
                            <Users size={18} className="text-[#D4AF37]" />
                            <div className="text-left">
                                <p className="text-[10px] font-bold uppercase text-gray-400 leading-none">In Queue / Capacity</p>
                                <p className="text-sm font-black text-gray-900 mt-0.5">
                                    {queueSummary?.waitingCount || activeQueueList.length} / {queueSummary?.maxCapacity || 10}
                                </p>
                            </div>
                        </div>

                        {/* Pause / Resume Button */}
                        <button
                            onClick={handleTogglePause}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                                queueSummary?.isPaused
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-amber-100 hover:bg-amber-200 text-amber-800"
                            }`}
                        >
                            {queueSummary?.isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
                            <span>{queueSummary?.isPaused ? "Resume Queue" : "Pause Queue"}</span>
                        </button>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                    <button
                        onClick={() => setActiveTab("queue")}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === "queue"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                        <Users size={16} />
                        <span>Active Queue ({activeQueueList.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("requests")}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                            activeTab === "requests"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                        <Clock size={16} />
                        <span>Incoming Requests ({incomingRequests.length})</span>
                        {incomingRequests.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-1 right-1"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                            activeTab === "history"
                                ? "bg-[#1a1a1a] text-white shadow-md"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
                            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                                <Users size={40} className="text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-serif font-bold text-gray-900">Queue is Currently Empty</h3>
                                <p className="text-xs text-gray-400 mt-1">New customers requesting service will appear here once accepted.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {activeQueueList.map((booking) => {
                                    const isInProgress = booking.status === "in_progress";
                                    const isArrived = booking.status === "arrived";

                                    return (
                                        <div
                                            key={booking._id}
                                            className={`bg-white rounded-3xl p-6 border transition-all shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
                                                isInProgress
                                                    ? "border-purple-200 bg-purple-50/20"
                                                    : isArrived
                                                    ? "border-emerald-200 bg-emerald-50/10"
                                                    : "border-gray-100"
                                            }`}
                                        >
                                            {/* LEFT: Queue Position Badge & Customer Info */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                                                    isInProgress
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : isArrived
                                                        ? "bg-emerald-600 text-white border-emerald-600"
                                                        : "bg-amber-50 text-[#D4AF37] border-amber-200"
                                                }`}>
                                                    <span className="text-[10px] font-bold uppercase leading-none">Queue</span>
                                                    <span className="text-xl font-black font-serif leading-tight">
                                                        #{booking.queuePosition || 1}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2.5">
                                                        <h3 className="font-bold text-gray-900 text-base">
                                                            {booking.customer?.fullName || booking.guestName || "Customer"}
                                                        </h3>
                                                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                                            isInProgress
                                                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                                                : isArrived
                                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }`}>
                                                            {isInProgress ? "In Service" : isArrived ? "Arrived & Waiting" : "En Route / Waiting"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                        {booking.customer?.phonenumber && (
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone size={12} /> {booking.customer.phonenumber}
                                                            </span>
                                                        )}
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} /> ~{booking.estimatedWaitMin || 0}m wait
                                                        </span>
                                                    </div>

                                                    {/* Services list */}
                                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                        {booking.serviceNames?.map((s, i) => (
                                                            <span key={i} className="text-[11px] bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg text-gray-600 font-medium">
                                                                {s}
                                                            </span>
                                                        ))}
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
                                                            placeholder="4-digit PIN"
                                                            value={cardCheckInPins[booking._id] || ""}
                                                            onChange={(e) =>
                                                                setCardCheckInPins((prev) => ({
                                                                    ...prev,
                                                                    [booking._id]: e.target.value.replace(/\D/g, ""),
                                                                }))
                                                            }
                                                            className="w-28 px-3 py-2 text-center font-mono font-bold text-sm tracking-widest border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={cardCheckInLoading[booking._id]}
                                                            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8962E] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
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
                                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
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
                            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                                <Clock size={40} className="text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-serif font-bold text-gray-900">No Pending Requests</h3>
                                <p className="text-xs text-gray-400 mt-1">When customers request queue entry, they will appear here for review.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {incomingRequests.map((req) => (
                                    <div
                                        key={req._id}
                                        className="bg-white rounded-3xl p-6 border border-amber-200/80 bg-amber-50/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {req.customer?.fullName || req.guestName || "Customer"}
                                                </h3>
                                                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                    Pending Review
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span>Total Amount: <strong>₹{req.totalAmount}</strong></span>
                                                <span>•</span>
                                                <span>Est. Duration: <strong>{req.durationMinutes || 30} mins</strong></span>
                                            </p>

                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {req.services?.map((s, i) => (
                                                    <span key={i} className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full font-medium text-gray-700">
                                                        {s.name || "Service"}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <button
                                                disabled={actionLoadingId === req._id}
                                                onClick={() => handleRejectRequest(req._id)}
                                                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                disabled={actionLoadingId === req._id}
                                                onClick={() => handleAcceptRequest(req._id)}
                                                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B8962E] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                                            >
                                                {actionLoadingId === req._id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle size={14} />
                                                )}
                                                <span>Accept Into Queue</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* TAB 3: HISTORY */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                {activeTab === "history" && (
                    <div className="space-y-4">
                        {historicalList.length === 0 ? (
                            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                                <CheckCircle size={40} className="text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-serif font-bold text-gray-900">No Historical Records</h3>
                                <p className="text-xs text-gray-400 mt-1">Completed appointments will be archived here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {historicalList.map((b) => (
                                    <div key={b._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-bold text-gray-900">{b.customer?.fullName || "Guest Customer"}</p>
                                            <p className="text-xs text-gray-400">
                                                {b.serviceNames?.join(", ") || "Salon Visit"} • ₹{b.totalAmount}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                                            b.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {b.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* PAYMENT & COMPLETION MODAL */}
            {paymentBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-serif font-bold text-gray-900">Complete & Settle Service</h3>
                                <p className="text-xs text-gray-400 mt-1">Confirm payment method and close out ticket</p>
                            </div>
                            <button onClick={() => setPaymentBooking(null)} className="p-1 rounded-full text-gray-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                            <span className="text-sm text-gray-500">Bill Amount</span>
                            <span className="text-2xl font-black font-serif text-gray-900">₹{paymentBooking.totalAmount}</span>
                        </div>

                        <div className="space-y-2 mb-6">
                            <label className="text-xs font-bold uppercase text-gray-500">Payment Collected Via</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: "cash", label: "Cash", icon: Banknote },
                                    { id: "upi", label: "UPI", icon: Smartphone },
                                    { id: "card", label: "Card", icon: CreditCard },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setPaymentMethod(m.id)}
                                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                                            paymentMethod === m.id
                                                ? "border-[#D4AF37] bg-amber-50/50 text-[#1a1a1a] font-bold"
                                                : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        <m.icon size={18} />
                                        <span className="text-xs">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentBooking(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-600 hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={paymentLoading}
                                onClick={handleCompleteService}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md"
                            >
                                {paymentLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                <span>Confirm Payment</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalonBookingsPage;
