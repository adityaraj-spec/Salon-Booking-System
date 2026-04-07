import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  salon: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Salon", 
    required: true 
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: "Haircare"
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    default: 0
  },
  threshold: {
    type: Number,
    default: 5
  },
  description: String,
  image: String
}, { timestamps: true });

export const Product = mongoose.model("Product", productSchema);
