import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Booking" 
    
  },
  method: String,
  amount: Number,
  status: String,
  transactionId: String
}, { timestamps: true });

export const Payment = mongoose.model("Payment", paymentSchema);
