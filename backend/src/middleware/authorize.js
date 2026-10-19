import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../lib/logger.js";
import { ROLES } from "../constants.js";

const normalizeRole = (role) => {
  const normalized = role?.toString().trim().toLowerCase();
  if (normalized === "owner") return ROLES.OWNER.toLowerCase();
  if (normalized === "admin") return ROLES.ADMIN.toLowerCase();
  return normalized;
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 *
 * @param {...string} allowedRoles - e.g. "admin", "owner", "customer"
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (!normalizedAllowedRoles.includes(userRole)) {
      logger.warn(
        { userId: req.user._id, role: req.user.role, allowedRoles, path: req.originalUrl },
        "[RBAC Blocked] User role insufficient for route"
      );
      throw new ApiError(403, "Access denied: insufficient role privileges");
    }

    next();
  };
};

/**
 * Attribute-Based Access Control (ABAC) Ownership Middleware — eliminates IDOR (SI1, SI2, SI5).
 *
 * Enforces resource ownership at the database document level before handler execution.
 * Checks:
 *  1. Admin role -> bypass with audit logging.
 *  2. Salon Owner -> validates that resource.salon matches req.ownerSalonId.
 *  3. User / Customer -> validates that resource[ownerFieldOnDoc] matches req.user._id.
 *
 * @param {import('mongoose').Model} model - Mongoose model to query
 * @param {string} [ownerParamKey="id"] - Parameter key in req.params containing resource ID
 * @param {string} [ownerFieldOnDoc="customer"] - Path on model document storing user ID
 */
export const requireOwnership = (model, ownerParamKey = "id", ownerFieldOnDoc = "customer") => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const resourceId = req.params[ownerParamKey];
    if (!resourceId) {
      throw new ApiError(400, "Resource ID missing from request parameters");
    }

    const doc = await model.findById(resourceId).lean();
    if (!doc) {
      throw new ApiError(404, "Resource not found");
    }

    // 1. Admins bypass ownership checks
    if (normalizeRole(req.user.role) === normalizeRole(ROLES.ADMIN)) {
      req.resourceDoc = doc;
      return next();
    }

    // 2. Salon Owners checking salon-bound resources (e.g. bookings at their salon)
    if (normalizeRole(req.user.role) === normalizeRole(ROLES.OWNER) && doc.salon && req.ownerSalonId) {
      if (doc.salon.toString() === req.ownerSalonId.toString()) {
        req.resourceDoc = doc;
        return next();
      }
    }

    // 3. Direct User Ownership Check
    const resourceOwnerId = doc[ownerFieldOnDoc]?.toString();
    if (!resourceOwnerId || resourceOwnerId !== req.user._id.toString()) {
      logger.warn(
        { userId: req.user._id, resourceId, role: req.user.role, ownerFieldOnDoc, resourceOwnerId },
        "[IDOR Blocked] Unauthorized access attempt to foreign resource"
      );
      throw new ApiError(403, "Forbidden: You do not have permission to access or modify this resource");
    }

    req.resourceDoc = doc;
    next();
  });
};
