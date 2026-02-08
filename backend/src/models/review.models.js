
import mongoose from "mongoose";
const reviewSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
    
  },
  salon: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Salon" 
    
  },
  rating: Number,
  reviewText: String
}, { timestamps: true });

export const Review = mongoose.model("Review", reviewSchema);
