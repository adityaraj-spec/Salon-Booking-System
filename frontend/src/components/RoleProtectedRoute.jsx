import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Pages inside RoleProtectedRoute that guests can still access */
const GUEST_ACCESSIBLE = ['/home'];

const RoleProtectedRoute = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // While auth state is being resolved, show subtle branded screen consistent with PageLoader
    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#fafafa] z-50">
                {/* Top gold shimmer bar consistent with App PageLoader */}
                <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden">
                    <div
                        className="h-full bg-[#D4AF37] animate-shimmer"
                        style={{ width: '40%', background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }}
                    />
                </div>
                {/* Subtle branded pulse */}
                <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm border border-[#D4AF37]/30 p-0.5 bg-white">
                        <img src="/logo.jpg" alt="SalonNow" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-gray-400">
                        Verifying session...
                    </span>
                </div>
            </div>
        );
    }

    // Redirect unassigned logged-in users to role selection
    if (user && user.role === 'unassigned') {
        return <Navigate to="/role-selection" replace />;
    }

    // Allow guests on discovery pages (e.g. /home)
    const isGuestPage = GUEST_ACCESSIBLE.some(p => location.pathname.startsWith(p));
    if (!user && !isGuestPage) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default RoleProtectedRoute;
