import { Router } from "express";
import { addStaff, getSalonStaff, deleteStaff, updateStaff } from "../controllers/staff.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/add").post(verifyJWT, addStaff);
router.route("/salon/:salonId").get(getSalonStaff);
router.route("/:staffId")
    .patch(verifyJWT, updateStaff)
    .delete(verifyJWT, deleteStaff);

export default router;
