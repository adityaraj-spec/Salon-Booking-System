import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from './pages/homePage.jsx'
import { LandingPage } from './pages/landingPage.jsx'
import { Shops } from './pages/shops-grid.jsx'
import { LoginPage } from './pages/loginPage.jsx'
import { SignUpPage } from './pages/signupPage.jsx'
import { Shop } from './pages/shop.jsx'
import { BookingPage } from './pages/bookingPage.jsx'
import { RoleSelectionPage } from "./pages/roleSelectionPage.jsx"
import { CreateSalonPage } from "./pages/createSalonPage.jsx"
import { ProfilePage } from "./pages/profilePage.jsx"
import { MyBookingsPage } from "./pages/bookingsListPage.jsx"
import SalonBookingsPage from "./pages/SalonBookingsPage.jsx";
import { SalonManagementPage } from "./pages/SalonManagementPage.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { Notification } from "./components/Notification.jsx";
import './App.css'

function App() {

  return (
    <NotificationProvider>
      <AuthProvider>
        <SocketProvider>
          <Notification />
          <BrowserRouter>
            <Routes>
              {/* Layout Wrapper for standard pages */}
              <Route element={<MainLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="home" element={<HomePage />} />
                <Route path="role-selection" element={<RoleSelectionPage />} />
                <Route path="create-salon" element={<CreateSalonPage />} />
                <Route path="shops" element={<Shops />} />
                <Route path="shop/:id" element={<Shop />} />
                <Route path="booking/:id" element={<BookingPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="bookings" element={<MyBookingsPage />} />
                <Route path="salon/dashboard" element={<SalonBookingsPage />} />
                <Route path="salon/manage" element={<SalonManagementPage />} />
              </Route>
              
              {/* Auth pages (no layout) */}
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignUpPage />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App
