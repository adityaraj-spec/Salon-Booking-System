import express from "express";
import path from "path";
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
import ApiError from "./utils/apiError.js";

const app = express();
app.set("trust proxy", 1);

app.use(cors({
    origin: (process.env.CORS_ORIGIN || "").split(","),
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

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


// SPA Fallback for generic routes (must be placed before generic error handler)
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.resolve("public", "index.html"));
});

// common error handling middleware
app.use((err, req, res, next) => {
    // Log error for debugging in server logs
    console.error(`Error [${err.statusCode || 500}]:`, err.message);
    if (err.stack) console.error(err.stack);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            data: err.data
        });
    }

    // Default error response for non-ApiError instances
    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

export default app;