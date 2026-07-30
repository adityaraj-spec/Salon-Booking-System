import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../constants.js";

/**
 * IDOR Protection Middleware Factory
 * Verifies that req.user owns the requested resource or has super_admin privileges.
 * 
 * @param {import('mongoose').Model} Model - Mongoose model to query
 * @param {string} paramName - Request param containing the resource ID (default: "id")
 * @param {string} ownerField - Document field containing the owner user ID (default: "owner")
 */
export const verifyOwnership = (Model, paramName = "id", ownerField = "owner") =>
  asyncHandler(async (req, _, next) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized - Authentication required");
    }

    // Super admins bypass ownership checks
    if (req.user.role?.toString().trim().toLowerCase() === ROLES.ADMIN.toLowerCase()) {
      return next();
    }

    const resourceId = req.params[paramName] || req.body[paramName];
    if (!resourceId) {
      throw new ApiError(400, `Missing required identifier: ${paramName}`);
    }

    const resource = await Model.findById(resourceId).select(ownerField);
    if (!resource) {
      throw new ApiError(404, "Resource not found");
    }

    const ownerId = resource[ownerField]?.toString();
    const userId = req.user._id.toString();

    if (ownerId !== userId) {
      console.warn(`[IDOR Guard] User ${userId} attempted unauthorized action on ${Model.modelName} ${resourceId}`);
      throw new ApiError(403, "Forbidden - You do not have permission to access or modify this resource");
    }

    next();
  });
