import mongoose from "mongoose";
const serviceSchema = new mongoose.Schema({
  salon: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Salon", 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
    
  },
  category: String,
  price: Number,
  duration: Number, // in minutes
  description: String
}, { timestamps: true });

export const Service = mongoose.model("Service", serviceSchema);
