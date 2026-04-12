import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware: Only allows super_admin role
 */
export const verifySuperAdmin = asyncHandler(async (req, _, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized - Please login");
    }
    if (req.user.role !== "super_admin") {
        throw new ApiError(403, "Forbidden - Super Admin access required");
    }
    next();
});

/**
 * Middleware: Allows salon owner OR super_admin
 */
export const verifySalonOwner = asyncHandler(async (req, _, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized - Please login");
    }
    if (req.user.role !== "salonOwner" && req.user.role !== "super_admin") {
        throw new ApiError(403, "Forbidden - Salon Owner access required");
    }
    next();
});
