import { Router } from "express";
import { registerSalon, getSalons, getSalonById, getOwnerSalon, updateSalonDetails } from "../controllers/salon.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/").get(getSalons);
router.route("/owner/my-salon").get(verifyJWT, getOwnerSalon);
router.route("/:id")
    .get(getSalonById)
    .patch(verifyJWT, updateSalonDetails);

router.route("/register").post(
    verifyJWT, 
    upload.array("images", 10), 
    registerSalon
);

export default router;
