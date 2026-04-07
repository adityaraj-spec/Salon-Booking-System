import { Router } from "express";
import { 
  getDashboardSnapshot, 
  getStaffLeaderboard, 
  getInventoryAlerts, 
  getRecentActivity 
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Protect all routes

router.route("/snapshot/:salonId").get(getDashboardSnapshot);
router.route("/leaderboard/:salonId").get(getStaffLeaderboard);
router.route("/alerts/:salonId").get(getInventoryAlerts);
router.route("/activity/:salonId").get(getRecentActivity);

export default router;
