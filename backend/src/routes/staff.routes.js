import { Router } from "express";
import {
  addStaff,
  getSalonStaff,
  deleteStaff,
  updateStaff,
  updateStaffScheduleHandler,
  addStaffExceptionHandler,
  removeStaffExceptionHandler,
} from "../controllers/staff.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorize, requireOwnership } from "../middleware/authorize.js";
import { Staff } from "../models/staff.models.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  updateStaffScheduleSchema,
  addStaffExceptionSchema,
} from "../schemas/staffSchedule.schema.js";

const router = Router();

// Staff creation & management restricted to owner / super_admin (IDOR & role guards)
router.route("/add").post(verifyJWT, authorize("owner", "admin"), upload.single("profilePic"), addStaff);
router.route("/salon/:salonId").get(getSalonStaff);

router
  .route("/:staffId")
  .patch(verifyJWT, authorize("owner", "admin"), requireOwnership(Staff, "staffId", "salon"), upload.single("profilePic"), updateStaff)
  .delete(verifyJWT, authorize("owner", "admin"), requireOwnership(Staff, "staffId", "salon"), deleteStaff);

router
  .route("/:id/schedule")
  .put(verifyJWT, authorize("owner", "admin"), requireOwnership(Staff, "id", "salon"), validate(updateStaffScheduleSchema), updateStaffScheduleHandler);

router
  .route("/:id/exceptions")
  .post(verifyJWT, authorize("owner", "admin"), requireOwnership(Staff, "id", "salon"), validate(addStaffExceptionSchema), addStaffExceptionHandler);

router
  .route("/:id/exceptions/:exceptionId")
  .delete(verifyJWT, authorize("owner", "admin"), requireOwnership(Staff, "id", "salon"), removeStaffExceptionHandler);

export default router;
