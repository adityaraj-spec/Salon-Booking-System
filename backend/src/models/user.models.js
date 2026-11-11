import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { ROLES } from "../constants.js";

const BCRYPT_SALT_ROUNDS = 12; // Upgraded from 10 for stronger hashing

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
      lowercase: true,
      trim: true,
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
      select: false, // Never return password hash in queries by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.UNASSIGNED,
    },
    refreshToken: {
      type: String,
      select: false, // Never return refresh token hash in queries by default
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeExpiry: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
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
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
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
    this.refreshToken = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
  }
};

userSchema.methods.isRefreshTokenCorrect = async function (refreshToken) {
  if (!this.refreshToken || !refreshToken) return false;
  return await bcrypt.compare(refreshToken, this.refreshToken);
};

export const User = mongoose.model("User", userSchema);
