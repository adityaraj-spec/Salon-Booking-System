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
  state: {
    type: String,
    required: false
  },
  pincode: {
    type: String,
    required: false
  },
  description: String,
  address: String,
  images: [String],
  contactNumber: {
    type: String,
    required: false
  },
  openingHours: String,
  closingHours: String,
  operatingHours: [
    {
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        required: true,
      },
      openTime: {
        type: String,
        default: "09:00",
      },
      closeTime: {
        type: String,
        default: "21:00",
      },
      isClosed: {
        type: Boolean,
        default: false,
      },
    },
  ],
  defaultBufferMinutes: {
    type: Number,
    default: 15,
  },
  rating: {
    type: Number,
    default: 0
  },
  totalSeats: {
    type: Number,
    default: 6 // Default capacity per salon
  },
  timezone: {
    type: String,
    default: "Asia/Kolkata"
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  }
}, { timestamps: true });

salonSchema.index({ location: "2dsphere" });

export const Salon = mongoose.model("Salon", salonSchema);
