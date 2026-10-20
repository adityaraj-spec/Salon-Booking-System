import crypto from "crypto";
import { Router } from "express";
import { runReminders } from "../services/reminder.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

const router = Router();

const verifyInternalSecret = (req, res, next) => {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const providedSecret = req.get("x-internal-secret")?.trim();

  if (!configuredSecret) {
    throw new ApiError(503, "Internal reminder endpoint is not configured");
  }

  const configuredBuffer = Buffer.from(configuredSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret || "", "utf8");
  const isValid = configuredBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(configuredBuffer, providedBuffer);

  if (!isValid) {
    throw new ApiError(401, "Unauthorized: Invalid or missing internal secret");
  }
  next();
};

const handleRunReminders = asyncHandler(async (req, res) => {
  const result = await runReminders();
  return res.status(200).json(new ApiResponse(200, result, "Reminders executed successfully"));
});

router.route("/run-reminders")
  .get(verifyInternalSecret, handleRunReminders)
  .post(verifyInternalSecret, handleRunReminders);

export default router;
