/**
 * DTO (Data Transfer Object) utility — prevents mass assignment vulnerabilities.
 *
 * Shared across owner-mutation endpoints, idempotency-record updates, and any
 * other place where only a known subset of fields from user input should reach
 * the database.
 */

// Immutable fields that must NEVER be set from user input, regardless of any
// whitelist configuration. Checked and stripped as a last line of defense.
const ALWAYS_BLOCKED_FIELDS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
  "salon",        // prevents ownership hijacking of staff/services
  "owner",        // prevents salon ownership reassignment
  "userId",       // prevents linking staff to a different user account
  "customer",     // prevents booking customer reassignment
  "booking",      // prevents payment booking reassignment
  "role",         // prevent privilege escalation via staff/user update endpoints
  "isVerified",   // prevent self-verification bypass
  "refreshToken", // prevent direct token injection
  "password",     // prevent password overwrite via update endpoints
  "loyaltyPoints", // prevent loyalty manipulation via update endpoints
]);

/**
 * Returns a new object containing ONLY the keys listed in `allowedKeys`,
 * after also stripping any keys in ALWAYS_BLOCKED_FIELDS.
 *
 * Silently drops any keys that are not in the whitelist — no error thrown.
 * The caller should validate the resulting object (e.g. with Zod) separately
 * to surface user-facing errors for missing required fields.
 *
 * @param {Record<string, unknown>} source - The raw input object (e.g. req.body)
 * @param {string[]} allowedKeys           - The whitelist of permitted field names
 * @returns {Record<string, unknown>}       The filtered object
 *
 * @example
 * const safe = pickAllowedFields(req.body, ["name", "role", "experience", "skills"]);
 * await Staff.findByIdAndUpdate(id, { $set: safe });
 */
export const pickAllowedFields = (source, allowedKeys) => {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const allowed = new Set(allowedKeys);
  const result = {};

  for (const [key, value] of Object.entries(source)) {
    // Hard-block: skip always-blocked fields regardless of whitelist
    if (ALWAYS_BLOCKED_FIELDS.has(key)) continue;
    // Soft-block: skip fields not in caller's whitelist
    if (!allowed.has(key)) continue;
    // Accept this field
    result[key] = value;
  }

  return result;
};

/**
 * Allowed fields for each entity type — single source of truth.
 * Import and use these constants in controllers rather than re-declaring
 * inline whitelists in each controller file.
 */
export const STAFF_UPDATABLE_FIELDS = [
  "name",
  "role",
  "experience",
  "skills",
  "profilePic",
  "isActive",
  "schedule",
  "exceptions",
];

export const SERVICE_UPDATABLE_FIELDS = [
  "name",
  "category",
  "price",
  "duration",
  "durationMin",
  "description",
];

export const SALON_UPDATABLE_FIELDS = [
  "name",
  "city",
  "state",
  "pincode",
  "description",
  "address",
  "contactNumber",
  "openingHours",
  "closingHours",
  "operatingHours",
  "defaultBufferMinutes",
  "slotIntervalMin",
  "bufferMin",
  "cancellationPolicy",
  "totalSeats",
  "isOpen",
  "timezone",
  "images",
];

export const USER_UPDATABLE_FIELDS = [
  "fullName",
  "phonenumber",
];
