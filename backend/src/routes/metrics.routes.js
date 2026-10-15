import { Router } from "express";
import { getPrometheusMetrics, getContentType } from "../lib/metrics.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    res.set("Content-Type", getContentType());
    const metrics = await getPrometheusMetrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

export default router;
