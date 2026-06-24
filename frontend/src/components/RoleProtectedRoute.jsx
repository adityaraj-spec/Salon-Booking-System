import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Pages inside RoleProtectedRoute that guests can still access */
const GUEST_ACCESSIBLE = ['/home'];

const RoleProtectedRoute = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // While auth state is being resolved, show a spinner instead of a blank page
    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
                <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
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
