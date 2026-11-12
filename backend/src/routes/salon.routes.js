import { Router } from "express";
import {
  registerSalon,
  getSalons,
  getSalonById,
  getOwnerSalon,
  updateSalonDetails,
  getCheapestSalons,
  getSalonCities,
} from "../controllers/salon.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorize, requireOwnership } from "../middleware/authorize.js";
import { Salon } from "../models/salon.models.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.js";
import { searchSalonsSchema } from "../schemas/search.schema.js";
import { getAvailability } from "../controllers/booking.controller.js";

const router = Router();

router.route("/").get(validate(searchSalonsSchema), getSalons);
router.route("/search").get(validate(searchSalonsSchema), getSalons);
router.route("/owner/my-salon").get(verifyJWT, authorize("owner", "admin"), getOwnerSalon);
router.route("/cheapest").get(getCheapestSalons);
router.route("/cities").get(getSalonCities);
router.route("/:id/availability").get(getAvailability);

router
  .route("/:id")
  .get(getSalonById)
  .patch(
    verifyJWT,
    authorize("owner", "admin"),
    requireOwnership(Salon, "id", "owner"),
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "beforePhotos", maxCount: 10 },
      { name: "afterPhotos", maxCount: 10 },
    ]),
    updateSalonDetails
  );

router
  .route("/register")
  .post(
    verifyJWT,
    authorize("owner", "admin"),
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "beforePhotos", maxCount: 10 },
      { name: "afterPhotos", maxCount: 10 },
    ]),
    registerSalon
  );

export default router;
