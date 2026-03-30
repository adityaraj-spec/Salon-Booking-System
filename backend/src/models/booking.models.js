import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 

  },
  salon: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Salon", 
    required: true 

  },
  staff: { 
    type: String, 
    ref: "Staff" 

  },
  services: [
    { 
    type: String, 
    ref: "Service" 

  }

  ],
  totalAmount: Number,
  date: String,
  time: String,
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

export const Booking = mongoose.model("Booking", bookingSchema);
