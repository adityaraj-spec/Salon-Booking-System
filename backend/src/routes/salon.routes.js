import { Router } from "express";
import { registerSalon, getSalons, getSalonById, getOwnerSalon, updateSalonDetails, getCheapestSalons } from "../controllers/salon.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/").get(getSalons);
router.route("/owner/my-salon").get(verifyJWT, getOwnerSalon);
router.route("/cheapest").get(getCheapestSalons);
router.route("/:id")
    .get(getSalonById)
    .patch(verifyJWT, upload.array("images", 10), updateSalonDetails);

router.route("/register").post(
    verifyJWT, 
    upload.array("images", 10), 
    registerSalon
);

export default router;
