import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/Layout/AdminLayout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import Login from './pages/Login';

// Super Admin Pages (Lazy Loaded)
const SuperDashboard = lazy(() => import('./pages/super-admin/Dashboard'));
const SuperSalons = lazy(() => import('./pages/super-admin/Salons'));
const SuperServices = lazy(() => import('./pages/super-admin/Services'));
const SuperBookings = lazy(() => import('./pages/super-admin/Bookings'));
const SuperCustomers = lazy(() => import('./pages/super-admin/Customers'));
const SuperOwners = lazy(() => import('./pages/super-admin/Owners'));
const SuperReports = lazy(() => import('./pages/super-admin/Reports'));
const SuperSettings = lazy(() => import('./pages/super-admin/Settings'));

// Owner Pages (Lazy Loaded)
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const MySalon = lazy(() => import('./pages/owner/MySalon'));
const MyServices = lazy(() => import('./pages/owner/MyServices'));
const MyBookings = lazy(() => import('./pages/owner/MyBookings'));
const MyStaff = lazy(() => import('./pages/owner/MyStaff'));
const MyReports = lazy(() => import('./pages/owner/MyReports'));

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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <LoadingSpinner text="Loading page..." />
      </div>
    }>
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
    </Suspense>
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
