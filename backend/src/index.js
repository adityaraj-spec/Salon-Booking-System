import dotenv from "dotenv";
import connectDB from "./db/index.js"
import app from "./app.js"

dotenv.config({
    path: "./.env"
});

connectDB()
    .then(() => {
        app.on("Error", (error) => {
            console.log("Errror", error)
            process.next(1)
        })

        app.listen(process.env.PORT || 8000, () => {
            console.log(`App is listening on ${process.env.PORT}`)
        })
    }).catch((error) => {
        console.log("MongoDB connection failed!!", error)
    })