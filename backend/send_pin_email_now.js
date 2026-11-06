import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import { sendBookingConfirmationEmail } from "./src/utils/mailer.js";

async function send() {
  console.log("Sending booking confirmation email with PIN 9419 to aadityajandaha07@gmail.com...");
  try {
    const res = await sendBookingConfirmationEmail(
      "aadityajandaha07@gmail.com",
      "Aaditya Raj",
      "My Salon",
      new Date().toISOString(),
      "6aedcfe4848fd4c901889239",
      ["haicut", "facial"],
      110,
      new Date(),
      "9419"
    );
    console.log("SUCCESS! Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAILED! Error:", err);
  }
}

send();

