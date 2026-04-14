import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { verifySuperAdmin } from "../middleware/adminAuth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
    testEmailConfig,
    getDashboard,
    getAllSalons, createSalon, deleteSalon,
    getAllServices, createService, updateService, deleteService,
    getAllBookings, updateBookingStatus,
    getAllCustomers,
    getAllOwners, createOwner, deleteOwner,
    getRevenueReport
} from "../controllers/admin.controller.js";

const router = Router();

// All routes require JWT + super_admin role
router.use(verifyJWT, verifySuperAdmin);

// Dashboard
router.get("/dashboard", getDashboard);

// Diagnostics
router.post("/test-email", testEmailConfig);

// Salons
router.get("/salons", getAllSalons);
router.post("/salons", upload.array("images", 10), createSalon);
router.delete("/salons/:id", deleteSalon);

// Services
router.get("/services", getAllServices);
router.post("/services", createService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

// Bookings
router.get("/bookings", getAllBookings);
router.put("/bookings/:id/status", updateBookingStatus);

// Customers
router.get("/customers", getAllCustomers);

// Owners
router.get("/owners", getAllOwners);
router.post("/owners", createOwner);
router.delete("/owners/:id", deleteOwner);

// Reports
router.get("/reports/revenue", getRevenueReport);

export default router;
