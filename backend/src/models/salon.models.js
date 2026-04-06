import mongoose from "mongoose";

const salonSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true

  },
  name: {
    type: String,
    required: true

  },
  city: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  address: String,
  images: [String],
  openingHours: String,
  closingHours: String,
  rating: {
    type: Number,
    default: 0
  },
  totalSeats: {
    type: Number,
    default: 6 // Default capacity per salon
  }
}, { timestamps: true });

export const Salon = mongoose.model("Salon", salonSchema);
