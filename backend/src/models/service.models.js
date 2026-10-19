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
  category: {
    type: String,
    enum: ['haircut', 'colour', 'spa', 'nails', 'facial', 'bridal'],
    default: 'haircut',
  },
  price: Number,
  duration: Number,
  durationMin: {
    type: Number,
    default: 30,
  },
  description: String
}, { timestamps: true });

export const Service = mongoose.model("Service", serviceSchema);
