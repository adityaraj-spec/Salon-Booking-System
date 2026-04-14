// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loading System — Frontend
// All skeleton components are exported from this single file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Base primitive ────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
    return <div className={`skeleton ${className}`} />;
}

// ── Salon Card Skeleton — used in shops-grid and landing page sliders ─────────
export function SalonCardSkeleton() {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
            {/* Image */}
            <Skeleton className="h-56 w-full rounded-none" />
            <div className="p-4 flex flex-col gap-2">
                {/* Stars row */}
                <Skeleton className="h-3 w-24 rounded-full" />
                {/* Name */}
                <Skeleton className="h-5 w-3/4 rounded-md" />
                {/* Location */}
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                {/* Phone */}
                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                {/* Bottom row */}
                <div className="flex items-center justify-between mt-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                </div>
            </div>
        </div>
    );
}

// ── Mini Salon Card — for landing page sliders (smaller) ─────────────────────
export function MiniSalonCardSkeleton() {
    return (
        <div className="min-w-[250px] w-[250px] flex-shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-3 flex flex-col gap-2">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
                <div className="flex items-center justify-between mt-1">
                    <Skeleton className="h-6 w-12 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                </div>
            </div>
        </div>
    );
}

// ── Destination Skeleton — for landing page city sliders ──────────────────────
export function DestinationCardSkeleton() {
    return (
        <div className="min-w-[180px] w-[180px] flex-shrink-0 rounded-2xl overflow-hidden">
            <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
    );
}

// ── Shop Detail Skeleton — single salon page ──────────────────────────────────
export function ShopDetailSkeleton() {
    return (
        <div className="w-full animate-pulse">
            {/* Hero image */}
            <Skeleton className="w-full h-72 md:h-96 rounded-none" />
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Title + location */}
                <div className="space-y-3">
                    <Skeleton className="h-8 w-2/3 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                    <Skeleton className="h-4 w-1/4 rounded-full" />
                </div>
                {/* Info badges */}
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Services list */}
                    <div className="md:col-span-2 space-y-3">
                        <Skeleton className="h-6 w-32 rounded-md" />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-36 rounded-md" />
                                    <Skeleton className="h-3 w-24 rounded-full" />
                                </div>
                                <Skeleton className="h-8 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                    {/* Booking panel */}
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-2xl" />
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Booking Card Skeleton — my bookings list ──────────────────────────────────
export function BookingCardSkeleton() {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 flex gap-4">
            {/* Left image */}
            <Skeleton className="h-24 w-24 flex-shrink-0 rounded-xl" />
            {/* Content */}
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5 rounded-md" />
                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                <Skeleton className="h-3.5 w-1/3 rounded-full" />
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
            </div>
            {/* Status badge */}
            <Skeleton className="h-6 w-20 rounded-full flex-shrink-0 self-start" />
        </div>
    );
}

// ── Profile Skeleton ──────────────────────────────────────────────────────────
export function ProfileSkeleton() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48 rounded-md" />
                    <Skeleton className="h-4 w-36 rounded-full" />
                </div>
            </div>
            {/* Form fields */}
            {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                </div>
            ))}
            <Skeleton className="h-12 w-full rounded-full" />
        </div>
    );
}

// ── Table Row Skeleton — for salon bookings / management pages ─────────────────
export function TableRowSkeleton({ cols = 5 }) {
    return (
        <div className="flex gap-4 items-center px-4 py-3.5 border-b border-gray-50">
            {[...Array(cols)].map((_, i) => (
                <Skeleton key={i} className={`h-4 rounded-full flex-1 ${i === 0 ? 'max-w-[160px]' : ''}`} />
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 items-center px-4 py-3.5 bg-gray-50 border-b border-gray-100">
                {[...Array(cols)].map((_, i) => (
                    <Skeleton key={i} className="h-3.5 rounded-full flex-1 max-w-[120px]" />
                ))}
            </div>
            {[...Array(rows)].map((_, i) => (
                <TableRowSkeleton key={i} cols={cols} />
            ))}
        </div>
    );
}

// ── Form Field Skeleton — for create/edit pages ───────────────────────────────
export function FormSkeleton({ fields = 6 }) {
    return (
        <div className="max-w-2xl space-y-5 py-6">
            {[...Array(fields)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                </div>
            ))}
            <Skeleton className="h-12 w-40 rounded-full mt-2" />
        </div>
    );
}
