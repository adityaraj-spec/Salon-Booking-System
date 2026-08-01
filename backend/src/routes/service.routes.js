import { Router } from "express";
import { addService, getSalonServices, deleteService, updateService } from "../controllers/service.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorize, requireOwnership } from "../middleware/authorize.js";
import { Service } from "../models/service.models.js";

const router = Router();

// Add service (salon owners & admin only)
router.route("/add").post(verifyJWT, authorize("owner", "admin"), addService);

// Public lookup for salon services
router.route("/salon/:salonId").get(getSalonServices);

// Service mutation routes (requires ABAC ownership check - Item 3)
router.route("/:serviceId")
    .patch(verifyJWT, authorize("owner", "admin"), requireOwnership(Service, "serviceId", "salon"), updateService)
    .delete(verifyJWT, authorize("owner", "admin"), requireOwnership(Service, "serviceId", "salon"), deleteService);

export default router;
