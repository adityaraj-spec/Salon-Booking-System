import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (user && user.role === 'unassigned') {
        return <Navigate to="/role-selection" replace />;
    }

    return <Outlet />;
};

export default RoleProtectedRoute;
