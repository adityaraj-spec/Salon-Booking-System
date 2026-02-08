import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import json from 'express'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(json({ limit : "16kb"}))
app.use(express.urlencoded({ limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

export default app