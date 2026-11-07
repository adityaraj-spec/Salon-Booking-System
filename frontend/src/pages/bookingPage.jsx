import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, NavLink, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useBookingCart } from "../context/BookingCartContext";
import { useSocket } from "../context/SocketContext";
import {
    Clock,
    User,
    Check,
    Scissors,
    ArrowLeft,
    Loader2,
    Users,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Hourglass,
    Sparkles,
    ShieldCheck,
    MapPin
} from "lucide-react";

export function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const socket = useSocket();

    // Salon & Catalog data
    const [salon, setSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [queueData, setQueueData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Selections
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Request lifecycle state
    const [submitting, setSubmitting] = useState(false);
    const [requestError, setRequestError] = useState("");
    const [activeBooking, setActiveBooking] = useState(null);
    const [checkingIn, setCheckingIn] = useState(false);
    const [proposedExtras, setProposedExtras] = useState(null);
    const [turnSoonAlert, setTurnSoonAlert] = useState(null);
    const [graceExpiredAlert, setGraceExpiredAlert] = useState(false);
    const [approvingExtras, setApprovingExtras] = useState(false);

    // Cart Context Integration
    const {
        items: cartItems,
        salonId: cartSalonId,
        setCartServices,
        clearCart,
    } = useBookingCart();

    const location = useLocation();
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const preselectedStaffId = urlParams.get("staffId");
    const preselectedStaffName = urlParams.get("staffName");

    // Initialize selected services from cart if matching this salon
    useEffect(() => {
        if (cartSalonId === id && cartItems.length > 0) {
            setSelectedServices(cartItems);
        }
    }, [id, cartItems, cartSalonId]);

    // Auto-select staff from URL query param once staff list is loaded
    useEffect(() => {
        if (!preselectedStaffId || staffMembers.length === 0 || selectedStaff) return;
        const match = staffMembers.find((s) => s._id === preselectedStaffId);
        if (match) {
            setSelectedStaff(match);
        } else if (preselectedStaffName) {
            setSelectedStaff({ _id: preselectedStaffId, name: decodeURIComponent(preselectedStaffName), role: "Stylist" });
        }
    }, [preselectedStaffId, preselectedStaffName, staffMembers, selectedStaff]);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login", { state: { from: `/booking/${id}` } });
        }
    }, [user, authLoading, navigate, id]);

    // Fetch Salon Details, Services, Staff, and Live Queue in parallel
    const fetchSalonData = useCallback(async () => {
        try {
            const [salonRes, servicesRes, staffRes, queueRes] = await Promise.all([
                axiosInstance.get(`/salons/${id}`),
                axiosInstance.get(`/services/salon/${id}`),
                axiosInstance.get(`/staff/salon/${id}`),
                axiosInstance.get(`/queue/salon/${id}`).catch(() => null),
            ]);

            if (salonRes.data?.success) setSalon(salonRes.data.data);
            if (servicesRes.data?.success) setServices(servicesRes.data.data || []);
            if (staffRes.data?.success) setStaffMembers(staffRes.data.data || []);
            if (queueRes?.data?.success) setQueueData(queueRes.data.data);
        } catch (err) {
            console.error("Failed to load salon queue details:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchSalonData();
        }
    }, [id, fetchSalonData]);

    // Periodically refresh salon queue stats
    useEffect(() => {
        if (!id) return;
        const interval = setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/queue/salon/${id}`);
                if (res.data?.success) {
                    setQueueData(res.data.data);
                }
            } catch {
                // silently fail polling
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [id]);

    // Real-time Socket.IO event listeners for queue lifecycle updates
    useEffect(() => {
        if (!socket) return;

        const handleRequestAccepted = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "waiting",
                    queuePosition: data.queuePosition,
                    estimatedWaitMin: data.estimatedWaitMin ?? prev.estimatedWaitMin,
                    estimatedWaitMax: data.estimatedWaitMax ?? prev.estimatedWaitMax,
                }));
            }
            fetchSalonData();
        };

        const handleRequestRejected = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "rejected",
                    rejectionReason: data.reason || "Declined by salon",
                }));
            }
            fetchSalonData();
        };

        const handleRequestExpired = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "expired",
                }));
            }
            fetchSalonData();
        };

        const handleServiceStarted = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "in_progress",
                    staffName: data.staffName || prev.staffName,
                    actualStartTime: data.actualStartTime || new Date(),
                }));
            }
            fetchSalonData();
        };

        const handleServiceCompleted = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "completed",
                    actualCompletionTime: new Date(),
                }));
            }
            fetchSalonData();
        };

        const handleQueueUpdated = (data) => {
            if (data.salonId === id) {
                fetchSalonData();
            }
        };

        if (id) {
            socket.emit("joinSalon", id);
        }
        if (activeBooking?._id) {
            socket.emit("joinQueue", activeBooking._id);
        }

        const handlePositionUpdated = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    queuePosition: data.queuePosition ?? prev.queuePosition,
                    estimatedWaitMin: data.estimatedWaitMin ?? prev.estimatedWaitMin,
                    estimatedWaitMax: data.estimatedWaitMax ?? prev.estimatedWaitMax,
                }));
            }
            fetchSalonData();
        };

        const handleYourTurnSoon = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setTurnSoonAlert(data.message || "You're next in line! Please arrive at the salon shortly.");
            }
        };

        const handleExtraServicesProposed = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setProposedExtras(data);
            }
        };

        const handleExtraServicesApproved = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setActiveBooking((prev) => ({
                    ...prev,
                    extraServices: data.approvedServices || prev.extraServices,
                    totalAmount: data.newTotal || prev.totalAmount,
                    durationMinutes: data.newDuration || prev.durationMinutes,
                }));
                setProposedExtras(null);
            }
        };

        const handleExtraServicesDeclined = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setProposedExtras(null);
            }
        };

        const handleGraceExpired = (data) => {
            if (activeBooking && (data.bookingId === activeBooking._id || data._id === activeBooking._id)) {
                setGraceExpiredAlert(true);
            }
        };

        socket.on("queue:request_accepted", handleRequestAccepted);
        socket.on("queue:request_rejected", handleRequestRejected);
        socket.on("queue:request_expired", handleRequestExpired);
        socket.on("queue:service_started", handleServiceStarted);
        socket.on("queue:service_completed", handleServiceCompleted);
        socket.on("queue:updated", handleQueueUpdated);
        socket.on("queue:position_updated", handlePositionUpdated);
        socket.on("queue:your_turn_soon", handleYourTurnSoon);
        socket.on("queue:extra_services_proposed", handleExtraServicesProposed);
        socket.on("queue:extra_services_approved", handleExtraServicesApproved);
        socket.on("queue:extra_services_declined", handleExtraServicesDeclined);
        socket.on("queue:arrival_grace_expired", handleGraceExpired);

        return () => {
            if (id) socket.emit("leaveSalon", id);
            if (activeBooking?._id) socket.emit("leaveQueue", activeBooking._id);
            socket.off("queue:request_accepted", handleRequestAccepted);
            socket.off("queue:request_rejected", handleRequestRejected);
            socket.off("queue:request_expired", handleRequestExpired);
            socket.off("queue:service_started", handleServiceStarted);
            socket.off("queue:service_completed", handleServiceCompleted);
            socket.off("queue:updated", handleQueueUpdated);
            socket.off("queue:position_updated", handlePositionUpdated);
            socket.off("queue:your_turn_soon", handleYourTurnSoon);
            socket.off("queue:extra_services_proposed", handleExtraServicesProposed);
            socket.off("queue:extra_services_approved", handleExtraServicesApproved);
            socket.off("queue:extra_services_declined", handleExtraServicesDeclined);
            socket.off("queue:arrival_grace_expired", handleGraceExpired);
        };
    }, [socket, activeBooking, id, fetchSalonData]);

    const toggleService = (service) => {
        setSelectedServices((prev) => {
            const exists = prev.find((s) => (s._id || s.serviceId) === (service._id || service.serviceId));
            const next = exists
                ? prev.filter((s) => (s._id || s.serviceId) !== (service._id || service.serviceId))
                : [...prev, service];
            setCartServices(salon || id, next);
            return next;
        });
    };

    const combinedDurationMin = useMemo(() => {
        const total = selectedServices.reduce(
            (sum, s) => sum + (Number(s.durationMin || s.duration) || 30),
            0
        );
        return total > 0 ? total : 30;
    }, [selectedServices]);

    const subtotal = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    }, [selectedServices]);

    // Handle Requesting Queue Position
    const handleRequestService = async () => {
        if (selectedServices.length === 0) {
            setRequestError("Please select at least one service.");
            return;
        }

        setSubmitting(true);
        setRequestError("");

        try {
            const serviceIds = selectedServices.map((s) => s._id || s.serviceId);
            const response = await axiosInstance.post("/queue/request", {
                salonId: id,
                serviceIds,
                staffId: selectedStaff?._id || undefined,
            });

            if (response.data?.success) {
                clearCart();
                setActiveBooking(response.data.data);
            } else {
                setRequestError(response.data?.message || "Unable to request queue position.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to join queue. Please retry.";
            setRequestError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Customer marks arrival
    const handleApproveExtras = async () => {
        if (!activeBooking) return;
        setApprovingExtras(true);
        try {
            const res = await axiosInstance.post(`/queue/${activeBooking._id}/approve-extras`);
            if (res.data?.success) {
                setActiveBooking((prev) => ({
                    ...prev,
                    extraServices: res.data.data.extraServices,
                    totalAmount: res.data.data.totalAmount,
                    durationMinutes: res.data.data.durationMinutes,
                }));
                setProposedExtras(null);
            }
        } catch (err) {
            console.error("Failed to approve extras:", err);
        } finally {
            setApprovingExtras(false);
        }
    };

    const handleDeclineExtras = async () => {
        if (!activeBooking) return;
        try {
            await axiosInstance.post(`/queue/${activeBooking._id}/decline-extras`, { reason: "Customer declined" });
            setProposedExtras(null);
        } catch (err) {
            console.error("Failed to decline extras:", err);
        }
    };

    const handleCheckIn = async () => {
        if (!activeBooking) return;
        setCheckingIn(true);
        try {
            const res = await axiosInstance.post(`/queue/${activeBooking._id}/check-in`);
            if (res.data?.success) {
                setActiveBooking((prev) => ({
                    ...prev,
                    status: "arrived",
                    arrivedAt: res.data.data.arrivedAt,
                }));
            }
        } catch (err) {
            console.error("Check-in error:", err);
        } finally {
            setCheckingIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Loading live salon queue status...</p>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ACTIVE QUEUE TRACKER VIEW (when request is placed)
    // ─────────────────────────────────────────────────────────────────────────────
    if (activeBooking) {
        const status = activeBooking.status;

        return (
            <div className="min-h-screen bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-xl bg-white border border-gray-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    {turnSoonAlert && (
                        <div className="mb-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-4 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-lg animate-pulse">
                            <Sparkles className="w-6 h-6 flex-shrink-0" />
                            <span>{turnSoonAlert}</span>
                        </div>
                    )}
                    {graceExpiredAlert && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                            <span>Your arrival grace window has ended. Please check in with the salon immediately to hold your position!</span>
                        </div>
                    )}
                    {proposedExtras && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#D4AF37]/30">
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-[#D4AF37] flex items-center justify-center mb-4 mx-auto">
                                    <Scissors className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-serif font-black text-center text-gray-900 mb-2">Additional Services Proposed</h3>
                                <p className="text-xs text-gray-500 text-center mb-4">
                                    Your stylist would like to add the following extra services to your visit:
                                </p>
                                <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2 border border-gray-100">
                                    {(proposedExtras.proposedServices || []).map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-gray-800">{s.name} (~{s.durationMin}m)</span>
                                            <span className="font-bold text-gray-900">+₹{s.price}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm font-black text-gray-900">
                                        <span>New Total:</span>
                                        <span className="text-[#D4AF37]">₹{proposedExtras.newEstimatedTotal}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleDeclineExtras}
                                        className="py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={handleApproveExtras}
                                        disabled={approvingExtras}
                                        className="py-3 rounded-xl bg-[#D4AF37] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#B8962E] transition-colors flex items-center justify-center gap-1 shadow-md"
                                    >
                                        {approvingExtras ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        <span>Accept</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-[0.03] rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    {/* STATUS 1: REQUESTED (Awaiting Acceptance) */}
                    {status === "requested" && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-6 relative">
                                <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-25"></span>
                                <Hourglass className="w-8 h-8 text-[#D4AF37] animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Request Sent to Salon</h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                                <strong>{salon?.name}</strong> has received your service request. The salon team will accept your entry into the queue shortly.
                            </p>
                            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 font-medium">
                                <p className="font-bold mb-1">⏱ Estimated Wait Once Admitted</p>
                                <p className="text-amber-900 font-bold text-base">
                                    ~{activeBooking.estimatedWaitMin || 10} – {activeBooking.estimatedWaitMax || 25} mins
                                </p>
                            </div>

                            {activeBooking.verificationPin && (
                                <div className="mt-6 max-w-sm mx-auto rounded-2xl border-2 border-dashed border-[#D4AF37] bg-gradient-to-r from-amber-50/90 to-orange-50/60 p-5 shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-md inline-block">
                                        Check-in Verification PIN
                                    </span>
                                    <p className="text-3xl font-black font-mono tracking-[0.35em] text-[#1a1a1a] my-2">
                                        {activeBooking.verificationPin}
                                    </p>
                                    <p className="text-xs text-amber-900 font-medium">Show this 4-digit code to your stylist upon arrival.</p>
                                </div>
                            )}

                            <div className="mt-8">
                                <button
                                    onClick={() => navigate("/bookings")}
                                    className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                                >
                                    View In My Bookings
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STATUS 2: WAITING / ACCEPTED (Customer in active queue) */}
                    {status === "waiting" && (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Accepted by Salon
                            </div>

                            <h2 className="text-3xl font-serif font-black text-[#1a1a1a] mb-1">You Are In The Queue!</h2>
                            <p className="text-gray-500 text-sm mb-6">Head towards <strong>{salon?.name}</strong>.</p>

                            {/* Big Queue Position Display */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-gray-900 rounded-3xl p-6 text-white shadow-xl mb-6 border border-[#D4AF37]/30">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">Your Queue Position</p>
                                <p className="text-5xl sm:text-6xl font-black font-serif my-2 tracking-tight text-white">
                                    #{activeBooking.queuePosition || 1}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Estimated Wait: <span className="text-[#D4AF37] font-bold">~{activeBooking.estimatedWaitMin || 0} – {activeBooking.estimatedWaitMax || 15} mins</span>
                                </p>
                            </div>

                            {/* 4-Digit Check-In PIN */}
                            {activeBooking.verificationPin && (
                                <div className="mb-6 rounded-2xl border border-dashed border-[#D4AF37] bg-amber-50/50 p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Check-in Verification PIN</p>
                                    <p className="text-3xl font-black tracking-[0.35em] text-[#1a1a1a] my-1">
                                        {activeBooking.verificationPin}
                                    </p>
                                    <p className="text-[11px] text-gray-500">Show this 4-digit code to your stylist upon arrival.</p>
                                </div>
                            )}

                            {/* Arrival Check-in Action */}
                            <button
                                onClick={handleCheckIn}
                                disabled={checkingIn}
                                className="w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider bg-[#D4AF37] text-white hover:bg-[#B8962E] active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 mb-4"
                            >
                                {checkingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                                <span>I Have Arrived at the Salon</span>
                            </button>

                            <button
                                onClick={() => navigate("/bookings")}
                                className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider transition-colors"
                            >
                                Go to My Bookings
                            </button>
                        </div>
                    )}

                    {/* STATUS 3: ARRIVED (Checked in at salon) */}
                    {status === "arrived" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Checked In Successfully</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                You are marked as arrived at <strong>{salon?.name}</strong>. Please relax in the waiting area.
                            </p>

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-gray-500">Queue Position</span>
                                    <span className="font-bold text-gray-900 text-lg">#{activeBooking.queuePosition}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Verification PIN</span>
                                    <span className="font-bold text-amber-600 font-mono text-xl tracking-widest">{activeBooking.verificationPin}</span>
                                </div>
                            </div>

                            <NavLink
                                to="/bookings"
                                className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors"
                            >
                                Track in My Bookings
                            </NavLink>
                        </div>
                    )}

                    {/* STATUS 4: IN_PROGRESS */}
                    {status === "in_progress" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
                                <Scissors className="w-8 h-8 animate-bounce" />
                            </div>
                            <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Service In Progress</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Your service is currently underway{activeBooking.staffName ? ` with ${activeBooking.staffName}` : ""}! Enjoy your experience.
                            </p>
                            <NavLink
                                to="/bookings"
                                className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors"
                            >
                                View Booking Details
                            </NavLink>
                        </div>
                    )}

                    {/* STATUS 5: COMPLETED */}
                    {status === "completed" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-serif font-black text-[#1a1a1a] mb-2">Service Completed!</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                Thank you for visiting <strong>{salon?.name}</strong>. We hope you loved your look!
                            </p>
                            <NavLink
                                to="/home"
                                className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors"
                            >
                                Back to Home
                            </NavLink>
                        </div>
                    )}

                    {/* STATUS 6: REJECTED */}
                    {status === "rejected" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Request Declined</h2>
                            <p className="text-gray-600 text-sm mb-4">
                                {activeBooking.rejectionReason || "The salon is unable to accommodate additional queue requests at this time."}
                            </p>
                            <p className="text-xs text-gray-400 mb-6">No charges have been made. You can try another salon or request again later.</p>
                            <button
                                onClick={() => setActiveBooking(null)}
                                className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors"
                            >
                                Modify Request
                            </button>
                        </div>
                    )}

                    {/* STATUS 7: EXPIRED */}
                    {status === "expired" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                                <Hourglass className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-serif font-black text-[#1a1a1a] mb-2">Request Timed Out</h2>
                            <p className="text-gray-600 text-sm mb-6">
                                The salon did not respond within the acceptance timeout window. No fee has been charged.
                            </p>
                            <button
                                onClick={() => setActiveBooking(null)}
                                className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NEW ON-DEMAND QUEUE REQUEST INTERFACE
    // ─────────────────────────────────────────────────────────────────────────────
    const queueSummary = queueData?.summary;
    const isSalonOpen = queueData?.salon?.isCurrentlyOpen ?? salon?.isOpen ?? true;
    const isAccepting = queueSummary ? queueSummary.isAccepting : true;
    const isPaused = queueSummary ? queueSummary.isPaused : false;
    const isQueueFull = queueSummary && queueSummary.waitingCount >= queueSummary.maxCapacity;

    const canJoinQueue = isSalonOpen && isAccepting && !isPaused && !isQueueFull;

    return (
        <div className="flex flex-col bg-[#fafafa] font-sans min-h-screen">
            <main className="flex-1 pt-12 md:pt-16 pb-16">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <NavLink to={`/shop/${id}`} className="p-2.5 bg-white border border-gray-100 hover:bg-gray-50 rounded-full transition-colors shadow-sm">
                            <ArrowLeft size={20} className="text-gray-700" />
                        </NavLink>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a]">Request Salon Queue</h1>
                                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                                    canJoinQueue
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : isPaused
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                    {canJoinQueue ? "Accepting Requests" : isPaused ? "Queue Paused" : "Not Accepting"}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                On-demand queue admission at <span className="text-[#D4AF37] font-semibold">{salon?.name}</span>
                            </p>
                        </div>
                    </div>

                    {/* LIVE SALON QUEUE STATUS BANNER */}
                    <div className="mb-10 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#D4AF37] shrink-0">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Workload & Estimated Wait</p>
                                <p className="text-xl font-serif font-black text-gray-900 mt-0.5">
                                    ~{queueSummary?.estimatedWaitRangeForNewCustomer?.min || 5} – {queueSummary?.estimatedWaitRangeForNewCustomer?.max || 20} mins wait
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">In Line Ahead</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {queueSummary?.waitingCount || 0} customer{(queueSummary?.waitingCount || 0) === 1 ? "" : "s"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Queue Capacity</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {queueSummary?.waitingCount || 0} / {queueSummary?.maxCapacity || 10}
                                </p>
                            </div>
                        </div>
                    </div>

                    {requestError && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{requestError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* LEFT COLUMN: SELECTIONS */}
                        <div className="lg:col-span-2 space-y-10">

                            {/* 1. Services Section */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">1</span>
                                    <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Select Desired Services</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                                    {services.length > 0 ? (
                                        services.map((service) => {
                                            const isSelected = selectedServices.some((s) => (s._id || s.serviceId) === service._id);
                                            return (
                                                <button
                                                    key={service._id}
                                                    onClick={() => toggleService(service)}
                                                    className={`group relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between text-left min-h-[145px] ${
                                                        isSelected
                                                            ? "border-[#D4AF37] bg-gradient-to-b from-amber-50/80 to-orange-50/30 shadow-md ring-1 ring-[#D4AF37]/30 scale-[1.02]"
                                                            : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                                                    }`}
                                                    type="button"
                                                >
                                                    {/* Top: Duration pill & Radio/Check */}
                                                    <div className="flex items-center justify-between w-full mb-2">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 group-hover:bg-gray-100 px-2 py-0.5 rounded-md">
                                                            <Clock size={10} className="text-[#D4AF37]" />
                                                            {service.durationMin || service.duration || 30}m
                                                        </span>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            isSelected
                                                                ? "bg-[#D4AF37] border-[#D4AF37] text-white shadow-sm"
                                                                : "border-gray-300 bg-white group-hover:border-gray-400"
                                                        }`}>
                                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                                        </div>
                                                    </div>

                                                    {/* Middle: Service Title & Description */}
                                                    <div className="my-1.5 flex-1">
                                                        <h3 className={`font-bold text-sm leading-snug transition-colors line-clamp-2 ${
                                                            isSelected ? "text-gray-900" : "text-gray-800"
                                                        }`}>
                                                            {service.name}
                                                        </h3>
                                                        {service.description && (
                                                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                                                {service.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Bottom: Price */}
                                                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between w-full">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Price</span>
                                                        <span className={`text-base font-black font-serif transition-colors ${
                                                            isSelected ? "text-[#D4AF37]" : "text-gray-900"
                                                        }`}>
                                                            ₹{service.price}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                            No active services catalog found for this salon.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 2. Stylist Section (Optional) */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">2</span>
                                    <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Preferred Stylist (Optional)</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {staffMembers.length > 0 ? (
                                        staffMembers.map((staff) => (
                                            <button
                                                key={staff._id}
                                                onClick={() => setSelectedStaff(selectedStaff?._id === staff._id ? null : staff)}
                                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all text-center ${
                                                    selectedStaff?._id === staff._id
                                                        ? "border-[#D4AF37] bg-orange-50/30 shadow-sm"
                                                        : "border-gray-100 bg-white hover:border-gray-200"
                                                }`}
                                                type="button"
                                            >
                                                <div className="relative inline-block mb-3">
                                                    <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-base border-2 border-[#D4AF37]/20 mx-auto">
                                                        {staff.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    {selectedStaff?._id === staff._id && (
                                                        <div className="absolute -bottom-1 -right-1 bg-[#D4AF37] p-1 rounded-full text-white">
                                                            <Check size={10} strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-xs md:text-sm truncate">{staff.name}</h3>
                                                <p className="text-[11px] text-gray-400 truncate mt-0.5">{staff.role || "Stylist"}</p>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                            First available stylist will be assigned upon arrival.
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* RIGHT COLUMN: QUEUE REQUEST SUMMARY */}
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 sticky top-24 shadow-sm">
                                <h2 className="text-lg font-serif font-bold text-[#1a1a1a] mb-6 border-b border-gray-50 pb-4">
                                    Request Summary
                                </h2>

                                <div className="space-y-4 mb-6">
                                    {selectedServices.length > 0 ? (
                                        <>
                                            {selectedServices.map((s) => (
                                                <div key={s._id || s.serviceId} className="flex justify-between items-start text-sm">
                                                    <div>
                                                        <span className="text-gray-800 font-medium block">{s.name}</span>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} className="text-[#D4AF37]" />
                                                            {s.durationMin || s.duration || 30} mins
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-gray-900">₹{s.price}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                                                <span>Combined Est. Service Time</span>
                                                <span className="font-semibold text-gray-800">{combinedDurationMin} mins</span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No services selected yet</p>
                                    )}
                                </div>

                                {selectedStaff && (
                                    <div className="mb-6 pt-4 border-t border-gray-50">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Preferred Stylist</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-xs border border-[#D4AF37]/20">
                                                {selectedStaff.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-gray-900">{selectedStaff.name}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-100 mt-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Est. Total Amount</span>
                                        <span className="text-2xl font-black font-serif text-[#1a1a1a]">₹{subtotal}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-snug">
                                        Payment is collected at the salon after your service is completed.
                                    </p>

                                    <button
                                        onClick={handleRequestService}
                                        disabled={!canJoinQueue || submitting || selectedServices.length === 0}
                                        className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                                            canJoinQueue && selectedServices.length > 0 && !submitting
                                                ? "bg-[#D4AF37] hover:bg-[#B8962E] text-white active:scale-[0.99]"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                        }`}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Users className="w-5 h-5" />
                                        )}
                                        <span>
                                            {!isSalonOpen
                                                ? "Salon Closed"
                                                : isPaused
                                                ? "Queue Paused"
                                                : isQueueFull
                                                ? "Queue Full"
                                                : "Request Place in Queue"}
                                        </span>
                                    </button>

                                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center pt-2">
                                        <ShieldCheck size={14} className="text-[#D4AF37]" />
                                        <span>Instant live queue tracking upon acceptance</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
