import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { SeatMatrixSkeleton } from "./skeletons/index.jsx";
import axiosInstance from "../api/axiosConfig";

const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getSlotLabel = (slot) => {
    if (slot?.time) return slot.time;
    if (!slot?.startTime) return "Time unavailable";
    return new Date(slot.startTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
    });
};

export function SeatMatrix({ salonId, date, onDateChange, durationMinutes = 30, staffId = null, onSlotSelect, compact = false }) {
    const today = useMemo(getTodayDate, []);
    const tomorrow = useMemo(() => {
        const value = new Date(`${today}T00:00:00`);
        value.setDate(value.getDate() + 1);
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }, [today]);
    const [internalDate, setInternalDate] = useState(today);
    const selectedDate = date || internalDate;
    const [availability, setAvailability] = useState({ slots: [], maxCapacity: 0, reason: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!salonId || !selectedDate) return undefined;
        let cancelled = false;
        const fetchAvailability = async () => {
            setLoading(true);
            setError("");
            const params = { date: selectedDate, durationMinutes, durationMin: durationMinutes, staffId: staffId || undefined };
            try {
                const response = await axiosInstance.get(`/salons/${salonId}/availability`, { params })
                    .catch(() => axiosInstance.get(`/bookings/availability/${salonId}`, { params }));
                if (!cancelled) setAvailability(response.data?.data || { slots: [], reason: "" });
            } catch (requestError) {
                if (!cancelled) {
                    setAvailability({ slots: [], maxCapacity: 0, reason: "" });
                    setError(requestError.response?.data?.message || "Unable to load available time slots.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchAvailability();
        const refreshTimer = window.setInterval(fetchAvailability, 5000);
        return () => {
            cancelled = true;
            window.clearInterval(refreshTimer);
        };
    }, [durationMinutes, salonId, selectedDate, staffId]);

    const changeDate = (value) => {
        setInternalDate(value);
        onDateChange?.(value);
    };
    const slots = Array.isArray(availability.slots) ? availability.slots : [];
    return (
        <div className={`rounded-xl border border-stone-200/50 bg-white shadow-soft-sm ${compact ? "p-5" : "p-6"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-[#D4AF37]" />
                        <h3 className="text-lg font-sans font-semibold text-[#1a1a1a]">Available Chairs &amp; Times</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select an available slot to continue booking.</p>
                </div>
                <input
                    aria-label="Choose a booking date"
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(event) => changeDate(event.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-[#D4AF37]"
                />
            </div>
            <div className="flex gap-2 mb-5">
                {[{ label: "Today", value: today }, { label: "Tomorrow", value: tomorrow }].map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => changeDate(option.value)}
                        className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${selectedDate === option.value ? "bg-[#1a1a1a] text-white" : "bg-gray-50 text-gray-600 hover:bg-amber-50"}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            {loading ? (
                <SeatMatrixSkeleton count={6} />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.length > 0 ? slots.map((slot) => {
                    const seatsLeft = Math.max(0, Number(slot.seatsLeft ?? slot.availableSeats) || 0);
                    const available = slot.available !== false && seatsLeft > 0;
                    const label = getSlotLabel(slot);
                    return (
                        <button
                            key={slot.startTime || label}
                            type="button"
                            disabled={!available}
                            onClick={() => onSlotSelect?.(slot, selectedDate)}
                            className={`rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] ${available ? "border-stone-200/80 hover:border-[#D4AF37] hover:bg-amber-50/40 shadow-soft-xs hover:shadow-soft-sm" : "cursor-not-allowed border-stone-100 bg-stone-50/60 text-stone-300 opacity-60"}`}
                        >
                            <span className="block text-sm font-bold">{label}</span>
                            <span className={`text-[11px] font-semibold ${available ? "text-emerald-600" : "text-gray-400"}`}>
                                {available ? `${seatsLeft}/${slot.maxCapacity || availability.maxCapacity || "?"} seats left` : "Fully booked"}
                            </span>
                        </button>
                    );
                    }) : (
                        <p className="col-span-full py-6 text-center text-sm text-gray-400">{error || availability.reason || "No slots available for this date."}</p>
                    )}
                </div>
            )}
        </div>
    );
}
