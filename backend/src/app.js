import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";

// routes imports
import userRouter from "./routes/user.routes.js";
import salonRouter from "./routes/salon.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import holdRouter from "./routes/hold.routes.js";
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
import { correlationIdMiddleware } from "./middleware/correlationId.js";
import { prometheusMetricsMiddleware } from "./middleware/metricsMiddleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { applySecurityHeaders } from "./middleware/securityHeaders.js";
import { authStrictLimiter, generalApiLimiter } from "./middleware/rateLimiter.js";
import logger from "./lib/logger.js";

import compression from "compression";

const app = express();
app.set("trust proxy", 1);

// correlationIdMiddleware MUST be first — seeds AsyncLocalStorage for all downstream middleware
app.use(correlationIdMiddleware);
app.use(prometheusMetricsMiddleware);
app.use(requestLoggerMiddleware);
app.use(applySecurityHeaders);
app.use(
  compression({
    level: 6,
    threshold: 1024,
  })
);

// Item 1: Strict CORS Whitelist with fail-closed behavior (No wildcard origin reflection)
const defaultOrigins = [
    "https://salon-booking-system-gaqg.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
];
const envOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((v) => v.split(","))
    .map((o) => o.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    // Allow any localhost / 127.0.0.1 port in local dev environments
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return true;
    }
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        logger.warn({ origin }, "[CORS Blocked] Request origin not in whitelist");
        return callback(new ApiError(403, "CORS policy violation: Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key"],
}));

// ─── CRITICAL: Webhook router MUST be mounted BEFORE express.json() ─────────
// Razorpay signs the raw byte buffer. express.json() would parse and discard it,
// making HMAC verification impossible. The webhook route has its own express.raw() parser.
app.use("/api/v1/payments/webhook", paymentWebhookRouter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));

// Root endpoint to handle base URL pings cleanly and prevent 404 logs
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "SalonNow API is up and running successfully",
        timestamp: new Date().toISOString(),
    });
});

// Health check probes and Metrics endpoint (mounted before static middleware)
app.use("/health", healthRouter);
app.use("/api/v1/health", healthRouter);
app.use("/metrics", metricsRouter);

app.use(express.static("public", { fallthrough: true }));
app.use(cookieParser());
app.use(sanitizeNoSQL);



// Apply Redis sliding-window limiters (SI11, SI12)
app.use("/api/", generalApiLimiter);
app.use("/api/v1/users/login", authStrictLimiter);
app.use("/api/v1/users/register", authStrictLimiter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/salons", salonRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/holds", holdRouter);
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

// 404 handler for undefined API routes
app.use((req, res, next) => {
    next(new ApiError(404, `Route ${req.originalUrl} not found`));
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