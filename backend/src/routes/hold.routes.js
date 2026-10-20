import { Router } from "express";
import { createHoldHandler } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { holdRateLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { createHoldSchema } from "../schemas/booking.schema.js";

const router = Router();

router.route("/").post(verifyJWT, holdRateLimiter, validate(createHoldSchema), createHoldHandler);

export default router;
