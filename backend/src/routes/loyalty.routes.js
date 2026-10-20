import { Router } from "express";
import {
  getLoyaltySummaryHandler,
  getLoyaltyBalanceHandler,
  getLoyaltyHistoryHandler,
  calculateLoyaltyDiscountHandler,
} from "../controllers/loyalty.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/summary").get(verifyJWT, getLoyaltySummaryHandler);
router.route("/balance").get(verifyJWT, getLoyaltyBalanceHandler);
router.route("/history").get(verifyJWT, getLoyaltyHistoryHandler);
router.route("/calculate").post(verifyJWT, calculateLoyaltyDiscountHandler).get(verifyJWT, calculateLoyaltyDiscountHandler);
router.route("/").get(verifyJWT, getLoyaltySummaryHandler);

export default router;
