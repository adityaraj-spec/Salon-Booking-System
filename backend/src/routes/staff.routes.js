import { Router } from "express";
import { addStaff, getSalonStaff, deleteStaff } from "../controllers/staff.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/add").post(verifyJWT, addStaff);
router.route("/salon/:salonId").get(getSalonStaff);
router.route("/:staffId").delete(verifyJWT, deleteStaff);

export default router;
