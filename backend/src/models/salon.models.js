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
  beforeAfterPhotos: [
    {
      beforeUrl: { type: String, required: true },
      afterUrl: { type: String, required: true },
      serviceName: { type: String, default: "" },
      stylistName: { type: String, default: "" },
      title: { type: String, default: "" },
    },
  ],
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
  slotIntervalMin: {
    type: Number,
    default: 30,
  },
  bufferMin: {
    type: Number,
    default: 0,
  },
  cancellationPolicy: {
    type: String,
    default: "Free cancellation up to 24 hours before your appointment. A 20% fee applies thereafter.",
  },
  rating: {
    type: Number,
    default: 0
  },
  ratingSum: {
    type: Number,
    default: 0
  },
  ratingCount: {
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
salonSchema.index({ city: 1, rating: -1, isOpen: 1 });
// Gap 7.1: MongoDB compound text index for full-text search (name, city, description)
// Enables $text + $meta:"textScore" ranked search as an Elasticsearch alternative
salonSchema.index({ name: "text", city: "text", description: "text" }, {
  weights: { name: 10, city: 5, description: 1 },
  name: "salon_fulltext_search"
});

export const Salon = mongoose.model("Salon", salonSchema);
