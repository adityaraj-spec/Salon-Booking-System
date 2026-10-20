import { Router } from "express";
import { registerSalon, getSalons, getSalonById, getOwnerSalon, updateSalonDetails, getCheapestSalons } from "../controllers/salon.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.js";
import { searchSalonsSchema } from "../schemas/search.schema.js";

import { getAvailability } from "../controllers/booking.controller.js";

const router = Router();

router.route("/").get(validate(searchSalonsSchema), getSalons);
router.route("/search").get(validate(searchSalonsSchema), getSalons);
router.route("/owner/my-salon").get(verifyJWT, getOwnerSalon);
router.route("/cheapest").get(getCheapestSalons);
router.route("/:id/availability").get(getAvailability);
router.route("/:id")
    .get(getSalonById)
    .patch(verifyJWT, upload.array("images", 10), updateSalonDetails);

router.route("/register").post(
    verifyJWT, 
    upload.array("images", 10), 
    registerSalon
);

export default router;
