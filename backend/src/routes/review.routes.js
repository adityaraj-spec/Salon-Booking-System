import { Router } from "express";
import { createReview, getSalonReviews } from "../controllers/review.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createReview);
router.route("/salon/:salonId").get(getSalonReviews);

export default router;
