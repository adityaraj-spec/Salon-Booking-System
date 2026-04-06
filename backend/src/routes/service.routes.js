import { Router } from "express";
import { addService, getSalonServices, deleteService } from "../controllers/service.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/add").post(verifyJWT, addService);
router.route("/salon/:salonId").get(getSalonServices);
router.route("/:serviceId").delete(verifyJWT, deleteService);

export default router;
