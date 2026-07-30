import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { cacheGet, cacheSet, cacheDel } from "../lib/cacheManager.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken?.id || decodedToken?._id;

    if (!userId) {
      throw new ApiError(401, "Invalid Access Token");
    }

    const cacheKey = `user:session:${userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(userId).select("-password -refreshToken").lean();
      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }
      await cacheSet(cacheKey, user, 300); // 5 minutes TTL
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware - Verification Error:", error.message);
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

export const clearUserSessionCache = async (userId) => {
  if (userId) {
    await cacheDel(`user:session:${userId}`);
  }
};