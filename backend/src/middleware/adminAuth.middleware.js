import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../constants.js";

/**
 * Middleware: Only allows super_admin role
 */
export const verifySuperAdmin = asyncHandler(async (req, _, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized - Please login");
    }

    const role = req.user.role?.toString().trim();
    
    // Check against constant (case-insensitive for safety)
    if (role?.toLowerCase() !== ROLES.ADMIN.toLowerCase()) {
        console.warn(`[AdminAuth] Access Denied: User ${req.user._id} (${req.user.email}) lacks ${ROLES.ADMIN} role. (Actual: ${req.user.role})`);
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

    const role = req.user.role?.toString().trim().toLowerCase();

    // Check against constants (case-insensitive)
    if (role !== ROLES.OWNER.toLowerCase() && role !== ROLES.ADMIN.toLowerCase()) {
        console.warn(`[AdminAuth] Access Denied: User ${req.user._id} (${req.user.email}) lacks owner/admin role. (Actual: ${req.user.role})`);
        throw new ApiError(403, "Forbidden - Salon Owner access required");
    }
    next();
});
