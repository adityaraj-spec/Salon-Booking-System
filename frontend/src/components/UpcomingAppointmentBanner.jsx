import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ChevronRight, X, Sparkles } from "lucide-react";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";

export function UpcomingAppointmentBanner() {
    const { user } = useAuth();
    const [upcomingBooking, setUpcomingBooking] = useState(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || user.role !== "customer") {
            setUpcomingBooking(null);
            return;
        }

        // Check if dismissed in this session
        const dismissedId = sessionStorage.getItem("dismissed_upcoming_booking");

        let isMounted = true;
        const fetchUpcoming = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get("/bookings/upcoming");
                if (isMounted && res.data?.success && res.data?.data) {
                    const booking = res.data.data;
                    if (dismissedId === booking._id) {
                        setIsDismissed(true);
                    } else {
                        setIsDismissed(false);
                    }
                    setUpcomingBooking(booking);
                } else if (isMounted) {
                    setUpcomingBooking(null);
                }
            } catch (err) {
                // Silently swallow in background
                if (isMounted) setUpcomingBooking(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchUpcoming();

        return () => {
            isMounted = false;
        };
    }, [user]);

    if (!upcomingBooking || isDismissed) {
        return null;
    }

    const salonName = upcomingBooking.salon?.name || "the salon";
    const formattedDate = upcomingBooking.startTime
        ? new Date(upcomingBooking.startTime).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
          })
        : upcomingBooking.date || "Today";

    const formattedTime = upcomingBooking.time
        ? upcomingBooking.time
        : upcomingBooking.startTime
        ? new Date(upcomingBooking.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

    const handleDismiss = () => {
        setIsDismissed(true);
        if (upcomingBooking?._id) {
            sessionStorage.setItem("dismissed_upcoming_booking", upcomingBooking._id);
        }
    };

    return (
        <aside
            aria-label="Upcoming appointment reminder"
            className="w-full bg-gradient-to-r from-[#1a1a1a] via-[#2a2415] to-[#1a1a1a] text-white border-b border-[#D4AF37]/30 shadow-md relative z-30 transition-all duration-300"
        >
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/40 animate-pulse">
                        <Clock size={16} />
                    </span>
                    <div className="truncate">
                        <span className="font-semibold text-white/90">
                            Upcoming Appointment:
                        </span>{" "}
                        <span className="text-gray-200">
                            Your appointment {upcomingBooking.salon?.name ? `at ` : ""}
                            <strong className="text-white font-bold">
                                {upcomingBooking.salon?.name || ""}
                            </strong>{" "}
                            is scheduled for{" "}
                            <span className="text-[#D4AF37] font-bold">
                                {formattedDate}
                            </span>{" "}
                            at{" "}
                            <span className="text-[#D4AF37] font-bold">
                                {formattedTime}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                    <Link
                        to="/bookings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#b8962e] transition-colors shadow-sm"
                    >
                        <span>View Details</span>
                        <ChevronRight size={14} />
                    </Link>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Dismiss banner"
                        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
