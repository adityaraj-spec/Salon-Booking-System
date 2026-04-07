import { Router } from "express";
import { 
  addToWaitlist, 
  getWaitlistBySalon, 
  notifyWaitlistClient, 
  updateWaitlistStatus 
} from "../controllers/waitlist.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/add").post(addToWaitlist);
router.route("/salon/:salonId").get(getWaitlistBySalon);
router.route("/notify/:waitlistId").post(notifyWaitlistClient);
router.route("/:waitlistId").patch(updateWaitlistStatus);

export default router;
