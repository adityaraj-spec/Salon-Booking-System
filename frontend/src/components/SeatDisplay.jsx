import { useMemo, useState } from "react";

export function SeatDisplay({
    totalSeats = 0,
    availableSeats = 0,
    loading = false,
    error = false,
    onSeatSelect,
}) {
    const [selectedSeat, setSelectedSeat] = useState(null);
    const seatCount = useMemo(() => Math.max(0, Math.floor(Number(totalSeats) || 0)), [totalSeats]);
    const freeSeats = Math.min(seatCount, Math.max(0, Math.floor(Number(availableSeats) || 0)));

    const activeSelectedSeat = selectedSeat && selectedSeat <= freeSeats ? selectedSeat : null;

    if (error || seatCount === 0) {
        return <p className="text-xs text-gray-400">Seat availability unavailable.</p>;
    }

    return (
        <div aria-label="Salon seat availability" className="relative">
            {loading && (
                <div className="absolute inset-0 z-10 rounded-full bg-white/70" aria-hidden="true" />
            )}
            <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: seatCount }, (_, index) => {
                    const seatNumber = index + 1;
                    const isFree = index < freeSeats;
                    const isSelected = activeSelectedSeat === seatNumber;
                    return (
                        <button
                            key={seatNumber}
                            type="button"
                            disabled={!isFree}
                            aria-label={`Seat ${seatNumber} ${isFree ? "available" : "occupied"}`}
                            aria-pressed={isSelected}
                            onClick={() => {
                                setSelectedSeat(seatNumber);
                                onSeatSelect?.(seatNumber);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-out select-none ${
                                isSelected
                                    ? "border border-[#D4AF37] bg-[#1a1a1a] text-white shadow-soft-sm scale-[1.02] ring-2 ring-[#D4AF37]/25"
                                    : isFree
                                        ? "border border-emerald-300/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 hover:border-emerald-400 hover:scale-[1.02] active:scale-[0.98] shadow-soft-xs"
                                        : "cursor-not-allowed border border-rose-200/50 bg-rose-50/40 text-rose-400 opacity-60"
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-[#D4AF37]" : isFree ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
                            <span>Seat {seatNumber}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
