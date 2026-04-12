import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { verifySalonOwner } from "../middleware/adminAuth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
    getOwnerDashboard,
    getOwnerSalon, updateOwnerSalon,
    getOwnerServices, createOwnerService, updateOwnerService, deleteOwnerService,
    getOwnerBookings, updateOwnerBookingStatus,
    getOwnerStaff, createOwnerStaff, updateOwnerStaff, deleteOwnerStaff,
    getOwnerReports
} from "../controllers/owner.controller.js";

const router = Router();

// All routes require JWT + salonOwner (or super_admin) role
router.use(verifyJWT, verifySalonOwner);

// Dashboard
router.get("/dashboard", getOwnerDashboard);

// Salon management (MOVED FROM MAIN WEBSITE)
router.get("/salon", getOwnerSalon);
router.put("/salon", upload.array("images", 10), updateOwnerSalon);

// Services (inline price editing supported)
router.get("/services", getOwnerServices);
router.post("/services", createOwnerService);
router.put("/services/:id", updateOwnerService);
router.delete("/services/:id", deleteOwnerService);

// Bookings
router.get("/bookings", getOwnerBookings);
router.put("/bookings/:id/status", updateOwnerBookingStatus);

// Staff
router.get("/staff", getOwnerStaff);
router.post("/staff", createOwnerStaff);
router.put("/staff/:id", updateOwnerStaff);
router.delete("/staff/:id", deleteOwnerStaff);

// Reports
router.get("/reports", getOwnerReports);

export default router;
