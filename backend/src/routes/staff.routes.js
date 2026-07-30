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
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  updateStaffScheduleSchema,
  addStaffExceptionSchema,
} from "../schemas/staffSchedule.schema.js";

const router = Router();

router.route("/add").post(verifyJWT, upload.single("profilePic"), addStaff);
router.route("/salon/:salonId").get(getSalonStaff);

router
  .route("/:staffId")
  .patch(verifyJWT, upload.single("profilePic"), updateStaff)
  .delete(verifyJWT, deleteStaff);

router
  .route("/:id/schedule")
  .put(verifyJWT, validate(updateStaffScheduleSchema), updateStaffScheduleHandler);

router
  .route("/:id/exceptions")
  .post(verifyJWT, validate(addStaffExceptionSchema), addStaffExceptionHandler);

router
  .route("/:id/exceptions/:exceptionId")
  .delete(verifyJWT, removeStaffExceptionHandler);

export default router;
