import { Router } from "express";
import { getLiveness, getReadiness } from "../controllers/health.controller.js";

const router = Router();

router.route("/").get(getLiveness);
router.route("/ready").get(getReadiness);

export default router;
