# SalonNow - Main Website & Customer Portal

This is the public-facing React application for SalonNow. It serves as both the primary discovery portal for customers and the integrated "Lite" management storefront for salon owners.

## 🎨 Key Features

### For Customers
- **Discovery Engine**: Robust search, category filtering, and "Top Rated" sorting to find the perfect salon experience.
- **Interactive Salon Map**: Mapbox integration displaying location pins for all registered salons in a city.
- **Seamless Booking Flow**: Real-time calendar and time-slot selection for immediate appointment scheduling without double-bookings.
- **Responsive Aesthetics**: A modern, glassmorphism-inspired UI with smooth transitions and offcanvas mobile navigation.

### For Salon Owners
- **Integrated Owner Dashboard (Lite)**: Salon owners have a conditional "Manage This Salon" shortcut on their public page.
- **Storefront Editor**: Quickly edit operating hours, upload gallery photos, and tweak basic details directly from the main site without opening a separate admin panel.

## 🛠️ Tech Stack
- **Framework**: React (Vite)
- **Styling**: TailwindCSS & Custom Vanilla CSS
- **State/Routing**: React Router DOM & Context API
- **Maps**: Mapbox GL JS

## 👨‍💻 Local Setup
1. Clone `frontend/.env.example` to `frontend/.env` and add your Mapbox Token along with the Backend API URLs.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The app will be accessible at `http://localhost:5173`.*
