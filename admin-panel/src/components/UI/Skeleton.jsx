// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loading System — Admin Panel
// All skeleton components are exported from this single file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Base primitive ────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

// ── StatCard Skeleton — mimics Stats cards on dashboards ──────────────────────
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-1/2 rounded-full" />
        <Skeleton className="h-6 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

// ── Dashboard Skeleton — mimics full dashboard layout ─────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Banner */}
      <Skeleton className="w-full h-40 rounded-[32px]" />
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Grid: Chart + List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <Skeleton className="h-6 w-32 rounded-md mb-6" />
          <Skeleton className="w-full h-60 rounded-xl" />
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <Skeleton className="h-6 w-40 rounded-md mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table Row Skeleton — for DataTable cells ──────────────────────────────────
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <div className="flex gap-4 items-center px-6 py-4 border-b border-gray-50">
      {[...Array(cols)].map((_, i) => (
        <Skeleton key={i} className={`h-4 rounded-full flex-1 ${i === 0 ? 'max-w-[200px]' : ''}`} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex gap-4 items-center px-6 py-4 bg-gray-50 border-b border-gray-100">
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

// ── Form Field Skeleton ───────────────────────────────────────────────────────
export function FormSkeleton({ fields = 5 }) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
      <Skeleton className="h-8 w-48 rounded-md mb-2" />
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-40 rounded-full" />
    </div>
  );
}

// ── Report/Analytics Skeleton ────────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8 mt-2 space-y-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-full opacity-50" />
      </div>
      <div className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12 rounded-full" />
          <Skeleton className="h-12 w-44 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12 rounded-full" />
          <Skeleton className="h-12 w-44 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-36 rounded-[32px]" />
        <Skeleton className="h-36 rounded-[32px]" />
      </div>
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm h-[400px]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    </div>
  );
}
