import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { ROLES } from "../constants.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phonenumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.UNASSIGNED,
    },
    refreshToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
    },
    verificationCodeExpiry: {
      type: Date,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Salon",
      },
    ],
    referralCode: {
      type: String,
      sparse: true,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordcorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (familyId, jti) {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("CRITICAL SECURITY ERROR: ACCESS_TOKEN_SECRET environment variable is missing!");
  }
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      role: this.role,
      jti: jti || crypto.randomUUID(),
      fam: familyId || crypto.randomUUID(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    }
  );
};

userSchema.methods.generateRefreshToken = function (familyId, jti) {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("CRITICAL SECURITY ERROR: REFRESH_TOKEN_SECRET environment variable is missing!");
  }
  return jwt.sign(
    {
      id: this._id,
      jti: jti || crypto.randomUUID(),
      fam: familyId || crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    }
  );
};

userSchema.methods.setRefreshToken = async function (refreshToken) {
  if (!refreshToken) {
    this.refreshToken = undefined;
  } else {
    this.refreshToken = await bcrypt.hash(refreshToken, 10);
  }
};

userSchema.methods.isRefreshTokenCorrect = async function (refreshToken) {
  if (!this.refreshToken || !refreshToken) return false;
  return await bcrypt.compare(refreshToken, this.refreshToken);
};

export const User = mongoose.model("User", userSchema);
