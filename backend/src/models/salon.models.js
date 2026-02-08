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
  description: String,
  address: String,
  location: {
    lat: Number,
    lng: Number
  },
  images: [String],
  openingHours: String,
  closingHours: String,
  rating: { 
    type: Number, 
    default: 0 
    
  }
}, { timestamps: true });

export const Salon = mongoose.model("Salon", salonSchema);
