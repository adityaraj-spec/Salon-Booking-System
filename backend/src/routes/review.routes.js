import { Router } from "express";
import { createReview, getSalonReviews, deleteReview, toggleLike } from "../controllers/review.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createReview);
router.route("/salon/:salonId").get(getSalonReviews);
router.route("/:reviewId").delete(verifyJWT, deleteReview);
router.route("/:reviewId/like").post(verifyJWT, toggleLike);

export default router;
