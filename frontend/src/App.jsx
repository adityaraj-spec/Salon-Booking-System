import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from './components/navPage.jsx'
import { Footer } from './components/footerPage.jsx'
import { HomePage } from './pages/homePage.jsx'
import { LoginPage } from './pages/loginPage.jsx'
import { SignUpPage } from './pages/signupPage.jsx'
import './App.css'

function App() {

  return (

    <BrowserRouter>
      <Routes>
          {/* <Route index element={<Home />} /> */}
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
