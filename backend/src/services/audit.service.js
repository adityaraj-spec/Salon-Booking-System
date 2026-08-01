import { AuditLog } from "../models/auditLog.model.js";
import logger from "../lib/logger.js";

/**
 * Logs an immutable audit event for privileged administrative and owner operations (SI10).
 *
 * @param {object} params
 * @param {import('express').Request} params.req - Active Express request (contains user, ip, headers)
 * @param {string} params.action - e.g. "STAFF_UPDATED", "REFUND_INITIATED", "ROLE_UPDATED"
 * @param {string} params.targetResource - e.g. "Staff", "Booking", "Salon"
 * @param {string} params.targetId - ID of the mutated document
 * @param {object} [params.changes] - Diff object { before, after }
 */
export const logAuditEvent = async ({ req, action, targetResource, targetId, changes = null }) => {
  if (!req || !req.user) {
    logger.warn({ action, targetResource, targetId }, "[AuditService] Action logged without authenticated user context");
    return;
  }

  try {
    const actor = req.user._id;
    const actorRole = req.user.role;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await AuditLog.create({
      actor,
      actorRole,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      action,
      targetResource,
      targetId: String(targetId),
      changes,
      timestamp: new Date(),
    });

    logger.info(
      { actor, actorRole, action, targetResource, targetId },
      "[AuditLog] Privileged action logged"
    );
  } catch (err) {
    // Non-blocking log failure warning — operation should succeed even if audit write fails
    logger.error({ err: err.message, action, targetId }, "[AuditService] Failed to write audit log record");
  }
};
