import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware: Only allows super_admin role
 */
export const verifySuperAdmin = asyncHandler(async (req, _, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized - Please login");
    }

    const role = req.user.role?.trim().toLowerCase();
    
    if (role !== "super_admin") {
        console.error(`[AdminAuth] 403 Forbidden: User ${req.user._id} has role "${req.user.role}" but super_admin is required.`);
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

    const role = req.user.role?.trim().toLowerCase();

    if (role !== "salonowner" && role !== "super_admin") {
        console.error(`[AdminAuth] 403 Forbidden: User ${req.user._id} has role "${req.user.role}" but salonOwner or super_admin is required.`);
        throw new ApiError(403, "Forbidden - Salon Owner access required");
    }
    next();
});
