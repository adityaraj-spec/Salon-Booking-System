import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// routes imports
import userRouter from "./routes/user.routes.js"
import salonRouter from "./routes/salon.routes.js"
import ApiError from "./utils/apiError.js"

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/salons", salonRouter)

// common error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            data: err.data
        })
    }

    // Default error response for non-ApiError instances
    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
    })
})

export default app