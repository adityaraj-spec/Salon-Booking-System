import mongoose from "mongoose";

/**
 * AuditLog — persistence model for cryptographic compliance logging (SI10).
 *
 * Every privileged administrative override, role change, owner staff/service modification,
 * and payment refund writes an immutable audit log record.
 */
const auditLogSchema = new mongoose.Schema(
  {
    // The user performing the action
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Role of the user at the time of execution
    actorRole: {
      type: String,
      required: true,
    },

    // Source IP address (trust proxy enabled)
    ipAddress: {
      type: String,
      default: "unknown",
    },

    // User-Agent header
    userAgent: {
      type: String,
      default: "unknown",
    },

    // Action verb: e.g. "STAFF_UPDATED", "REFUND_INITIATED", "ROLE_UPDATED", "SALON_DELETED"
    action: {
      type: String,
      required: true,
      index: true,
    },

    // Target entity type (e.g. "Staff", "Booking", "Salon", "User")
    targetResource: {
      type: String,
      required: true,
    },

    // Target entity document ID
    targetId: {
      type: String,
      required: true,
      index: true,
    },

    // Detailed field-level diff: { before, after }
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ISO timestamp of action
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for audit queries
auditLogSchema.index({ targetResource: 1, targetId: 1, timestamp: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
