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
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { Notification } from "./components/Notification.jsx";
import './App.css'

function App() {

  return (
    <NotificationProvider>
      <AuthProvider>
        <Notification />
        <BrowserRouter>
          <Routes>
            <Route index element={<LandingPage />} />
            <Route path="home" element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignUpPage />} />
            <Route path="role-selection" element={<RoleSelectionPage />} />
            <Route path="create-salon" element={<CreateSalonPage />} />
            <Route path="shops" element={<Shops />} />
            <Route path="shop/:id" element={<Shop />} />
            <Route path="booking" element={<BookingPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App
