import { Router } from "express";
import {
  createOrderHandler,
  verifyPaymentHandler,
  refundHandler,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
  refundBookingSchema,
} from "../schemas/payment.schema.js";

const router = Router();

// Customer payment endpoints
router.route("/create-order").post(verifyJWT, validate(createOrderSchema), createOrderHandler);
router.route("/verify").post(verifyJWT, validate(verifyPaymentSchema), verifyPaymentHandler);
router.route("/refund").post(verifyJWT, validate(refundBookingSchema), refundHandler);

export default router;
