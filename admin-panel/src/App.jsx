import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/Layout/AdminLayout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import Login from './pages/Login';

// Super Admin Pages
import SuperDashboard from './pages/super-admin/Dashboard';
import SuperSalons from './pages/super-admin/Salons';
import SuperServices from './pages/super-admin/Services';
import SuperBookings from './pages/super-admin/Bookings';
import SuperCustomers from './pages/super-admin/Customers';
import SuperOwners from './pages/super-admin/Owners';
import SuperReports from './pages/super-admin/Reports';
import SuperSettings from './pages/super-admin/Settings';

// Owner Pages
import OwnerDashboard from './pages/owner/Dashboard';
import MySalon from './pages/owner/MySalon';
import MyServices from './pages/owner/MyServices';
import MyBookings from './pages/owner/MyBookings';
import MyStaff from './pages/owner/MyStaff';
import MyReports from './pages/owner/MyReports';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'super_admin' ? '/super-admin/dashboard' : '/owner/dashboard'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user
          ? <Navigate to={user.role === 'super_admin' ? '/super-admin/dashboard' : '/owner/dashboard'} replace />
          : <Login />}
      />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminLayout role="super_admin" />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperDashboard />} />
        <Route path="salons" element={<SuperSalons />} />
        <Route path="services" element={<SuperServices />} />
        <Route path="bookings" element={<SuperBookings />} />
        <Route path="customers" element={<SuperCustomers />} />
        <Route path="owners" element={<SuperOwners />} />
        <Route path="reports" element={<SuperReports />} />
        <Route path="settings" element={<SuperSettings />} />
      </Route>

      {/* Owner Routes */}
      <Route path="/owner" element={
        <ProtectedRoute allowedRoles={['salonOwner', 'super_admin']}>
          <AdminLayout role="owner" />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="salon" element={<MySalon />} />
        <Route path="services" element={<MyServices />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="staff" element={<MyStaff />} />
        <Route path="reports" element={<MyReports />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'super_admin' ? '/super-admin/dashboard' : '/owner/dashboard'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          success: { style: { background: '#10b981', color: 'white' } },
          error: { style: { background: '#ef4444', color: 'white' } },
        }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
