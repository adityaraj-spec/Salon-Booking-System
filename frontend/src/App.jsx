import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from './pages/homePage.jsx'
import { Shops } from './pages/shops-grid.jsx'
import { LoginPage } from './pages/loginPage.jsx'
import { SignUpPage } from './pages/signupPage.jsx'
import { Shop } from './pages/shop.jsx'
import { BookingPage } from './pages/bookingPage.jsx'
import './App.css'

function App() {

  return (

    <BrowserRouter>
      <Routes>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
          <Route path="shops" element={<Shops />} />
          <Route path="shops/:id" element={<Shop />} />
          <Route path="booking" element={<BookingPage />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
