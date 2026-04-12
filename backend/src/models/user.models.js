import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  phonenumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"]
  },
  role: {
    type: String,
    enum: ["customer", "staff", "salonOwner", "super_admin"],
    default: "customer"
  },
  refreshToken: {
    type: String,
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Salon"
  }]
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return

  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordcorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}
export const User = mongoose.model("User", userSchema);
