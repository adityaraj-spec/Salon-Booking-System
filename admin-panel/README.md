# SalonNow - Admin Command Center

This is the dedicated back-office React application. It serves two distinct administrative roles separated by strict conditional rendering and role-based access checks.

## 📊 Key Features

### 👑 For Super Admins (Global Oversight)
- **System Analytics**: View total platform revenue, total active customers, and overall booking volume.
- **Salon Onboarding**: Review, approve, or reject new salon applications to maintain platform quality.
- **Global User Management**: Modify platform-wide settings (Requires `super_admin` role).

### 🏢 For Salon Owners (Operational Dashboard)
- **Deep Analytics**: View daily/weekly revenue charts specific to their own salon.
- **Comprehensive Staff Management**: Add stylists and allocate specific beauty services to them.
- **Booking Fulfillment**: A dedicated list view to manage, accept, or decline incoming customer appointments.
- **Secure Redirection**: Owners are neatly redirected from the main website to this portal via secure tokens when they need to do "heavy-lifting" operational tasks (like modifying staff shifts).

## 🛠️ Tech Stack
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **State Management**: Context API

## 👨‍💻 Local Setup
1. Clone `admin-panel/.env.example` to `admin-panel/.env` and ensure `VITE_API_URL` points to your running backend instance.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The admin panel will be accessible at `http://localhost:5174`.*
