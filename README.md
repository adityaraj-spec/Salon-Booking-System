# SalonNow - Premium Salon Booking System

SalonNow is a comprehensive, full-stack digital platform designed to bridge the gap between beauty salons and their clients. It features a robust multi-role architecture that seamlessly connects customers, salon owners, and administrators. 

---

## Why Take Your Salon Online?

In today's digital age, relying solely on walk-ins and phone calls limits your business potential. Here's why getting your salon online with SalonNow is a game-changer:

- **24/7 Booking Availability**: Customers can book appointments at any time, even outside of your business hours, significantly reducing missed opportunities.
- **Reduce No-Shows**: Automated real-time notifications and reminders ensure clients don't forget their appointments.
- **Reach a Wider Audience**: A digital storefront allows new customers in your city to discover your services, read reviews, and view your work through your gallery.
- **Streamlined Operations**: Eliminate manual appointment books. Staff can view their daily schedules on their phones, and owners get complete oversight without being physically present in the salon.
- **Data-Driven Decisions**: With an online system, you unlock powerful analytics—track your most popular services, monitor revenue trends, and identify peak business hours.

---

## Comprehensive Features

###  For Customers
*   **Intelligent Discovery**: Powerful search and filter functions to find salons by name, exact city, maximum price, and top ratings.
*   **Interactive Maps**: View salon locations dynamically via integrated Mapbox functionality to find the closest option.
*   **Smart Booking Engine**: Check real-time availability and instantly schedule appointments without waiting for a confirmation call.
*   **Review & Rating System**: Share experiences and guide other users through an intuitive 5-star rating system.
*   **Favorites List**: Bookmark go-to salons for rapid re-booking.
*   **Live Notifications**: Receive instant updates if booking statuses change.

### For Salon Owners
*   **Direct Storefront Management**: A "Lite" integrated dashboard on the main website right on your salon's public page to quickly update hours, address, and gallery photos.
*   **Operational Admin Dashboard**: A separate, dedicated Admin Panel for heavy-lifting tasks.
*   **Staff Scheduling**: Add team members and assign specific beauty services to them.
*   **Revenue Analytics**: Track daily and weekly earnings with visual charts.
*   **Booking Fulfilment**: Accept, modify, or decline incoming customer appointments.

### For Super Admins
*   **Platform Oversight**: Total control over the entire ecosystem via the Admin Panel.
*   **Onboarding Management**: Approve or reject newly registered salons to ensure quality control on the platform.
*   **Global Analytics**: Gain a macro-view of total platform revenue, total active customers, and platform growth.

---

## Technology Stack

*   **Frontend**: React.js, TailwindCSS, Bootstrap 5.3 (Offcanvas utilities)
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Real-time Infrastructure**: Socket.io (for instant notifications)
*   **Media & Cloud Storage**: Cloudinary (Secure image handling)
*   **Mapping & Geospatial Queries**: Mapbox SDK
*   **Authentication & Security**: JSON Web Tokens (JWT), Bcrypt password hashing, custom Role-Based Access Control (RBAC) middleware.

---

##  How to Run Locally

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
Before you begin, ensure you have the following installed and set up:
1.  **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
2.  **MongoDB** - A local instance or a free MongoDB Atlas URI.
3.  **Cloudinary Account** - For image uploads. Get your API keys [here](https://cloudinary.com/).
4.  **Mapbox Account** - For the map token. Get it [here](https://www.mapbox.com/).
5.  **Gmail Account** - Used to send outgoing emails via nodemailer (App Passwords required).

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd Salon-Booking-System-main
```

### Step 2: Running the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create your environment file:
   Rename `.env.sample` to `.env` and fill in your credentials (see the "Environment Variables" section below).
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend should start on `http://localhost:8000`.*

### Step 3: Running the Main Frontend (Customer/Owner Lite)
1. Open a new terminal tab and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Create your environment file:
   Rename `.env.example` to `.env` and fill in your variables.
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend should start on `http://localhost:5173`.*

### Step 4: Running the Admin Panel (Super Admin / Detailed Owner Dashboard)
1. Open a third terminal tab and navigate to the admin-panel folder:
   ```bash
   cd admin-panel
   ```
2. Install admin panel dependencies:
   ```bash
   npm install
   ```
3. Create your environment file:
   Rename `.env.example` to `.env`.
4. Start the admin panel development server:
   ```bash
   npm run dev
   ```
   *The admin panel should start on `http://localhost:5174`.*

---

## Required Environment Variables

To run this project, you will need to configure `.env` files in all three directories. 

### `/backend/.env`
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174

ACCESS_TOKEN_SECRET=your_jwt_access_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_CLOUD_API_KEY=your_cloudinary_api_key
CLOUDINARY_CLOUD_API_SECRET=your_cloudinary_api_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### `/frontend/.env`
```env
VITE_EMAIL=support@salonnow.com
VITE_PHONE=1234567890
VITE_API_URL=http://localhost:8000/api/v1
VITE_BACKEND_URL=http://localhost:8000
VITE_ADMIN_URL=http://localhost:5174
VITE_APP_NAME=SalonNow
```

### `/admin-panel/.env`
```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## User Roles

The system uses a centralized role system defined in `backend/src/constants.js`:

- **CUSTOMER**: Public user who can browse and book.
- **OWNER**: Salon proprietor who manages their specific salon(s).
- **ADMIN**: Super Admin with global system oversight.
- **STAFF**: Personnel assigned to specific salons.

---

*Designed and developed to modernize the beauty service industry.*
