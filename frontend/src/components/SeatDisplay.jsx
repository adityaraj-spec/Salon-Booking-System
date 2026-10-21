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
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                isSelected
                                    ? "border border-[#1a1a1a] bg-[#1a1a1a] text-white"
                                    : isFree
                                        ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500"
                                        : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                            }`}
                        >
                            Seat {seatNumber}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
