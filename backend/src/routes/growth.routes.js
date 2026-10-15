import { Router } from "express";
import {
  createReviewHandler,
  getLoyaltySummaryHandler,
  applyReferralCodeHandler,
  getReferralCodeHandler,
} from "../controllers/growth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  createVerifiedReviewSchema,
  applyReferralCodeSchema,
} from "../schemas/growth.schema.js";

const router = Router();

router.route("/review").post(verifyJWT, validate(createVerifiedReviewSchema), createReviewHandler);
router.route("/loyalty").get(verifyJWT, getLoyaltySummaryHandler);
router.route("/referral/code").get(verifyJWT, getReferralCodeHandler);
router.route("/referral/apply").post(verifyJWT, validate(applyReferralCodeSchema), applyReferralCodeHandler);

export default router;
