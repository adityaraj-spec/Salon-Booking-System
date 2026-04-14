import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { UIProvider } from "./context/UIContext.jsx";
import { Notification } from "./components/Notification.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import RoleProtectedRoute from "./components/RoleProtectedRoute.jsx";
import './App.css'

// Lazy load pages to reduce initial bundle size
const LandingPage = lazy(() => import('./pages/landingPage.jsx').then(m => ({ default: m.LandingPage })));
const Shops = lazy(() => import('./pages/shops-grid.jsx').then(m => ({ default: m.Shops })));
const LoginPage = lazy(() => import('./pages/loginPage.jsx').then(m => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import('./pages/signupPage.jsx').then(m => ({ default: m.SignUpPage })));
const Shop = lazy(() => import('./pages/shop.jsx').then(m => ({ default: m.Shop })));
const BookingPage = lazy(() => import('./pages/bookingPage.jsx').then(m => ({ default: m.BookingPage })));
const RoleSelectionPage = lazy(() => import("./pages/roleSelectionPage.jsx").then(m => ({ default: m.RoleSelectionPage })));
const CreateSalonPage = lazy(() => import("./pages/createSalonPage.jsx").then(m => ({ default: m.CreateSalonPage })));
const ProfilePage = lazy(() => import("./pages/profilePage.jsx").then(m => ({ default: m.ProfilePage })));
const MyBookingsPage = lazy(() => import("./pages/bookingsListPage.jsx").then(m => ({ default: m.MyBookingsPage })));
const SalonBookingsPage = lazy(() => import("./pages/SalonBookingsPage.jsx"));
const SalonManagementPage = lazy(() => import("./pages/SalonManagementPage.jsx").then(m => ({ default: m.SalonManagementPage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage.jsx").then(m => ({ default: m.FavoritesPage })));

/**
 * Loading Fallback - A subtle shimmer bar for route transitions
 */
const PageLoader = () => (
  <div className="fixed top-0 left-0 right-0 h-1 z-[9999] overflow-hidden">
    <div className="h-full bg-[#D4AF37] animate-shimmer" style={{ width: '40%', background: 'linear-gradient(to right, transparent, #D4AF37, transparent)' }}></div>
  </div>
);

function App() {

  return (
    <UIProvider>
      <NotificationProvider>
        <AuthProvider>
          <SocketProvider>
            <Notification />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Layout Wrapper for standard pages */}
                  <Route element={<MainLayout />}>
                    <Route path="role-selection" element={<RoleSelectionPage />} />
                    
                    <Route element={<RoleProtectedRoute />}>
                      <Route index element={<LandingPage />} />
                      <Route path="home" element={<Shops />} />
                      <Route path="create-salon" element={<CreateSalonPage />} />
                      <Route path="shop/:id" element={<Shop />} />
                      <Route path="booking/:id" element={<BookingPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route path="bookings" element={<MyBookingsPage />} />
                      <Route path="salon/dashboard" element={<SalonBookingsPage />} />
                      <Route path="salon/manage" element={<SalonManagementPage />} />
                      <Route path="favorites" element={<FavoritesPage />} />
                    </Route>
                  </Route>
                  
                  {/* Auth pages (no layout) */}
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignUpPage />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </NotificationProvider>
    </UIProvider>
  )
}

export default App
