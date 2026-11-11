// ─────────────────────────────────────────────────────────────────────────────
// SalonNow Centralized Skeleton Loading Component System
// Consistent design tokens: warm stone/champagne shimmer, 12px radius, responsive
// ─────────────────────────────────────────────────────────────────────────────

// ── Base Atomic Primitives ───────────────────────────────────────────────────

/**
 * Atomic skeleton box with customizable className
 */
export function Skeleton({ className = '' }) {
    return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * Text line or paragraph placeholder
 */
export function SkeletonText({ lines = 1, className = '', lastLineWidth = 'w-3/5' }) {
    if (lines === 1) {
        return <Skeleton className={`h-4 w-full rounded-md ${className}`} />;
    }
    return (
        <div className={`space-y-2 ${className}`}>
            {[...Array(lines)].map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 rounded-md ${i === lines - 1 ? lastLineWidth : 'w-full'}`}
                />
            ))}
        </div>
    );
}

/**
 * Circular or rounded avatar placeholder
 */
export function SkeletonAvatar({ size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-14 h-14',
        xl: 'w-20 h-20'
    };
    return (
        <Skeleton
            className={`rounded-full shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}
        />
    );
}

/**
 * Pill / Badge placeholder
 */
export function SkeletonBadge({ className = '' }) {
    return <Skeleton className={`h-6 w-20 rounded-full ${className}`} />;
}

/**
 * Action button placeholder
 */
export function SkeletonButton({ className = '' }) {
    return <Skeleton className={`h-11 w-32 rounded-xl ${className}`} />;
}

/**
 * Card container with standardized borders and soft shadows
 */
export function SkeletonCard({ className = '', children }) {
    return (
        <div className={`bg-white border border-stone-200/50 rounded-xl p-5 shadow-soft-xs ${className}`}>
            {children}
        </div>
    );
}

// ── Standard Composite Components ────────────────────────────────────────────

/**
 * Salon Card Skeleton — used in shops-grid and Favorites
 */
export function SalonCardSkeleton() {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
            <Skeleton className="h-56 w-full rounded-none" />
            <div className="p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-1/2 rounded-full" />
                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                <div className="flex items-center justify-between mt-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * Mini Salon Card — for landing page sliders
 */
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

/**
 * Destination Skeleton — for landing page city sliders
 */
export function DestinationCardSkeleton() {
    return (
        <div className="min-w-[180px] w-[180px] flex-shrink-0 rounded-xl overflow-hidden">
            <Skeleton className="h-52 w-full rounded-xl" />
        </div>
    );
}

/**
 * Shop Detail Skeleton — single salon page
 */
export function ShopDetailSkeleton() {
    return (
        <div className="w-full animate-pulse">
            <Skeleton className="w-full h-72 md:h-96 rounded-none" />
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                <div className="space-y-3">
                    <Skeleton className="h-8 w-2/3 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                    <Skeleton className="h-4 w-1/4 rounded-full" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <div className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Booking Card Skeleton — my bookings list
 */
export function BookingCardSkeleton() {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-xl p-5 flex gap-4">
            <Skeleton className="h-24 w-24 flex-shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5 rounded-md" />
                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                <Skeleton className="h-3.5 w-1/3 rounded-full" />
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full flex-shrink-0 self-start" />
        </div>
    );
}

/**
 * Profile Skeleton — for profile edit view
 */
export function ProfileSkeleton() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center gap-4">
                <SkeletonAvatar size="xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48 rounded-md" />
                    <Skeleton className="h-4 w-36 rounded-full" />
                </div>
            </div>
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

/**
 * Table Row Skeleton — for tabular layouts
 */
export function TableRowSkeleton({ cols = 5 }) {
    return (
        <div className="flex gap-4 items-center px-4 py-3.5 border-b border-gray-50">
            {[...Array(cols)].map((_, i) => (
                <Skeleton key={i} className={`h-4 rounded-full flex-1 ${i === 0 ? 'max-w-[160px]' : ''}`} />
            ))}
        </div>
    );
}

/**
 * Table Skeleton — for queue and dashboard lists
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
    return (
        <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden">
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

/**
 * Form Field Skeleton — for forms and settings
 */
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

/**
 * Seat Matrix Skeleton — for SeatMatrix time slots
 */
export function SeatMatrixSkeleton({ count = 6 }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-busy="true" aria-label="Loading available time slots">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="rounded-xl border border-stone-200/60 p-3.5 space-y-2 bg-white">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/**
 * Points Ledger Skeleton — for loyalty transactions list
 */
export function PointsLedgerSkeleton({ count = 3 }) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50" aria-busy="true">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="h-3 w-20 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}

// ── Full-Page & Dashboard Skeletons ──────────────────────────────────────────

/**
 * Booking Page Skeleton — for bookingPage.jsx initial load
 */
export function BookingPageSkeleton() {
    return (
        <div className="flex flex-col bg-[#fafafa] font-sans min-h-screen" aria-busy="true" aria-label="Loading booking page">
            <main className="flex-1 pt-16 md:pt-20 pb-20 lg:pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-60 rounded-lg" />
                            <Skeleton className="h-6 w-32 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-44 rounded-full mt-2" />
                    </div>

                    {/* Wait Time Banner */}
                    <div className="bg-white border border-stone-200/50 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-28 rounded-full" />
                                <Skeleton className="h-6 w-48 rounded-md" />
                            </div>
                        </div>
                        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-stone-200/50 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-20 rounded-full" />
                                <Skeleton className="h-5 w-24 rounded-md" />
                            </div>
                            <div className="space-y-1.5">
                                <Skeleton className="h-3 w-24 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-md" />
                            </div>
                        </div>
                    </div>

                    {/* Main Grid: Content (2 cols) & Summary Widget (1 col) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Stylist Selector */}
                            <div className="bg-white border border-stone-200/50 rounded-xl p-6 shadow-sm space-y-4">
                                <Skeleton className="h-5 w-36 rounded-md" />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="border border-stone-100 rounded-xl p-3 flex flex-col items-center gap-2">
                                            <Skeleton className="w-12 h-12 rounded-full" />
                                            <Skeleton className="h-3.5 w-16 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Services Selector */}
                            <div className="bg-white border border-stone-200/50 rounded-xl p-6 shadow-sm space-y-4">
                                <Skeleton className="h-5 w-36 rounded-md" />
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border border-stone-100 rounded-xl">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-40 rounded-md" />
                                                <Skeleton className="h-3 w-24 rounded-full" />
                                            </div>
                                            <Skeleton className="h-6 w-16 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Booking Summary Panel */}
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-stone-200/50 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
                                <Skeleton className="h-6 w-44 rounded-md" />
                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3.5 w-24 rounded-full" />
                                        <Skeleton className="h-3.5 w-16 rounded-full" />
                                    </div>
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3.5 w-20 rounded-full" />
                                        <Skeleton className="h-3.5 w-12 rounded-full" />
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-stone-100">
                                        <Skeleton className="h-5 w-20 rounded-md" />
                                        <Skeleton className="h-5 w-20 rounded-md" />
                                    </div>
                                </div>
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

/**
 * Salon Dashboard Skeleton — for SalonBookingsPage.jsx
 */
export function SalonDashboardSkeleton() {
    return (
        <div className="min-h-screen bg-[#fafafa] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6" aria-busy="true" aria-label="Loading salon queue dashboard">
            {/* Header Card */}
            <div className="bg-white rounded-xl p-6 md:p-8 border border-stone-200/50 shadow-soft-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-72 rounded-lg" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-80 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-11 w-36 rounded-xl" />
                    <Skeleton className="h-11 w-32 rounded-xl" />
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 border border-stone-200/50 shadow-soft-xs space-y-3">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-3.5 w-20 rounded-full" />
                            <Skeleton className="w-8 h-8 rounded-lg" />
                        </div>
                        <Skeleton className="h-7 w-16 rounded-md" />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
            </div>

            {/* Content Table */}
            <TableSkeleton rows={5} cols={5} />
        </div>
    );
}

/**
 * Salon Management Skeleton — for SalonManagementPage.jsx
 */
export function SalonManagementSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8 font-sans space-y-8" aria-busy="true" aria-label="Loading salon management">
            <header className="space-y-2">
                <Skeleton className="h-8 w-64 rounded-lg" />
                <Skeleton className="h-4 w-96 rounded-full" />
            </header>

            {/* 3-Column Top Banner */}
            <div className="bg-white rounded-xl p-6 lg:p-10 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-8 lg:gap-12">
                <Skeleton className="w-full lg:w-72 h-64 lg:h-auto rounded-xl shrink-0" />
                <div className="flex-1 space-y-4 py-2">
                    <Skeleton className="h-7 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-1/2 rounded-full" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 w-24 rounded-lg" />
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
                <div className="w-full lg:w-64 space-y-3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8">
                    <Skeleton className="h-4 w-28 rounded-full" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-3 border-b border-gray-200 pb-3">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            {/* Form Placeholder */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <FormSkeleton fields={5} />
            </div>
        </div>
    );
}
