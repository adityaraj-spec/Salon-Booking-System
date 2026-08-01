import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

// routes imports
import userRouter from "./routes/user.routes.js";
import salonRouter from "./routes/salon.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import reviewRouter from "./routes/review.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import serviceRouter from "./routes/service.routes.js";
import staffRouter from "./routes/staff.routes.js";
import adminRouter from "./routes/admin.routes.js";
import ownerRouter from "./routes/owner.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import paymentWebhookRouter from "./routes/payment.webhook.routes.js";
import healthRouter from "./routes/health.routes.js";
import growthRouter from "./routes/growth.routes.js";
import metricsRouter from "./routes/metrics.routes.js";
import ApiError from "./utils/apiError.js";

import { sanitizeNoSQL } from "./middleware/sanitize.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { prometheusMetricsMiddleware } from "./middleware/metricsMiddleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import logger from "./lib/logger.js";

const app = express();
app.set("trust proxy", 1);

app.use(requestIdMiddleware);
app.use(prometheusMetricsMiddleware);
app.use(requestLoggerMiddleware);

app.use(cors({
    origin: (process.env.CORS_ORIGIN || "").split(","),
    credentials: true
}));

// ─── CRITICAL: Webhook router MUST be mounted BEFORE express.json() ─────────
// Razorpay signs the raw byte buffer. express.json() would parse and discard it,
// making HMAC verification impossible. The webhook route has its own express.raw() parser.
app.use("/api/v1/payments/webhook", paymentWebhookRouter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));

// Health check probes and Metrics endpoint (mounted before static middleware)
app.use("/health", healthRouter);
app.use("/api/v1/health", healthRouter);
app.use("/metrics", metricsRouter);


app.use(express.static("public", { fallthrough: true }));
app.use(cookieParser());
app.use(sanitizeNoSQL);


// ─── Rate Limiters ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // strict: 10 attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts, please try again after 15 minutes." }
});

const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3, // very strict: 3 resends per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many resend attempts. Please wait before requesting again." }
});

// Apply general limiter to all API routes
app.use("/api/", generalLimiter);

// routes declaration
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Salon Booking System API is running successfully."
    });
});

// Apply strict auth rate limiters to sensitive auth endpoints
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/register", authLimiter);
app.use("/api/v1/users/verify-email", authLimiter);
app.use("/api/v1/users/resend-verification", resendLimiter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/salons", salonRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/owner", ownerRouter);
app.use("/api/v1/payments", paymentRouter); // non-webhook payment routes (create-order, verify) — JSON body is fine here
app.use("/api/v1/growth", growthRouter);


// SPA Fallback for generic routes (must be placed before generic error handler)
app.get(/^(?!\/(api|health)).*$/, (req, res, next) => {
    const indexPath = path.resolve("public", "index.html");
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    next();
});

// Common error handling middleware
app.use((err, req, res, next) => {
    const requestId = req.id || "N/A";
    logger.error({ requestId, statusCode: err.statusCode || 500, err: err.message, stack: err.stack }, "Request error");

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code || `ERR_${err.statusCode}`,
            errors: err.errors || [],
            data: err.data || null,
            requestId,
        });
    }

    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
        code: "INTERNAL_SERVER_ERROR",
        errors: [],
        requestId,
    });
});

export default app;