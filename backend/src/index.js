import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./db/index.js"
import app from "./app.js"
import { initializeSocket } from "./socket.js";

dotenv.config({
    path: "./.env"
});

const server = createServer(app);
initializeSocket(server);

connectDB()
    .then(() => {
        server.on("error", (error) => {
            console.log("Error", error)
            process.exit(1)
        })

        server.listen(process.env.PORT || 8000, () => {
            console.log(`App is listening on ${process.env.PORT || 8000}`)
        })
    }).catch((error) => {
        console.log("MongoDB connection failed!!", error)
    })

// CORS fix reload