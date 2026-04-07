import mongoose from "mongoose";
const staffSchema = new mongoose.Schema({
  salon: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Salon", 
    required: true 
  },
  name: String,
  role: String,
  experience: Number,
  skills: [String],
  profilePic: String,
  color: {
    type: String,
    default: "#D4AF37" // Default gold
  }
});
export const Staff = mongoose.model("Staff", staffSchema);
