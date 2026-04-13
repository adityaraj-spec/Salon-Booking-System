# SalonNow - Backend API Server

This is the core Node.js backend for the SalonNow booking platform. It handles all business logic, database interactions, authentication, and real-time events.

## ⚙️ Key Features
- **Strict Role-Based Access Control (RBAC)**: Secure middleware protecting routes based on roles (`customer`, `salonOwner`, `super_admin`).
- **Real-Time Notifications**: Integrated Socket.io for instant booking confirmations and status updates.
- **Geospatial Queries**: Mapbox geocoding integration to convert salon addresses into precise map coordinates.
- **Cloud Media**: Automatic image uploading and cleanup using Cloudinary.
- **Automated Emails**: Nodemailer integration with Ethereal fallback for booking receipts and shop registrations.
- **Ownership Security**: Advanced controller logic to ensure salon owners can only modify their own salon's data.

## 🛠️ Tech Stack
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB & Mongoose ODM
- **Auth**: JSON Web Tokens (JWT) & Bcrypt
- **Events**: Socket.io

## 👨‍💻 Local Setup
1. Ensure your MongoDB instance is running.
2. Clone `backend/.env.sample` to `backend/.env` and fill the required secrets.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:8000`.*