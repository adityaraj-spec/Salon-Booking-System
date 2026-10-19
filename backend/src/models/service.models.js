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
    lowercase: true,
    trim: true,
    enum: ['haircut', 'hair', 'colour', 'color', 'spa', 'nails', 'facial', 'bridal', 'shave', 'massage', 'other'],
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
