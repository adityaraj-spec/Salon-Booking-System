import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJWT, getNotifications);
router.route("/mark-all-read").patch(verifyJWT, markAllAsRead);
router.route("/:id/read").patch(verifyJWT, markAsRead);

export default router;
