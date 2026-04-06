import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// routes imports
import userRouter from "./routes/user.routes.js";
import salonRouter from "./routes/salon.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import reviewRouter from "./routes/review.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import serviceRouter from "./routes/service.routes.js";
import staffRouter from "./routes/staff.routes.js";
import ApiError from "./utils/apiError.js";

const app = express();

app.use(cors({
    origin: (process.env.CORS_ORIGIN || "").split(","),
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/salons", salonRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/staff", staffRouter);

// common error handling middleware
app.use((err, req, res, next) => {
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