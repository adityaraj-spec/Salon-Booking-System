import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema({
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
  preferredDate: {
    type: String, // String format (YYYY-MM-DD)
    required: true
  },
  preferredTimeRange: {
    type: String, // e.g. "Morning", "Afternoon", "Evening" or a specific range
    default: "Anytime"
  },
  preferredStaff: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Staff"
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Service"
  }],
  status: {
    type: String,
    enum: ["waiting", "offered", "booked", "cancelled"],
    default: "waiting"
  },
  notes: String
}, { timestamps: true });

export const Waitlist = mongoose.model("Waitlist", waitlistSchema);
