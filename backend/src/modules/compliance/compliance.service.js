import { User } from "../../models/user.models.js";
import { Booking } from "../../models/booking.models.js";
import { Review } from "../../models/review.models.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { createCloudEvent } from "../platform/cloudevent.js";
import { withTransactionRetry } from "../../utils/transaction.js";
import ApiError from "../../utils/apiError.js";
import logger from "../../lib/logger.js";
import crypto from "crypto";

/**
 * Executes automated GDPR data erasure (Right to be Forgotten).
 * Anonymizes PII while maintaining financial transaction records for tax compliance.
 */
export const executeGDPRErasure = async ({ userId, requestedBy, ipAddress = "unknown", userAgent = "unknown" }) => {
  return await withTransactionRetry(async (session) => {
    const user = await User.findById(userId).session(session);
    if (!user) throw new ApiError(404, "User not found for erasure");

    const anonymizedHash = crypto.createHash("sha256").update(`${userId}:${Date.now()}`).digest("hex").slice(0, 12);
    const anonymizedEmail = `deleted_${anonymizedHash}@privacy.salonnow.internal`;
    const anonymizedName = "Anonymized User";

    // 1. Anonymize User Profile (PII Stripping)
    user.fullName = anonymizedName;
    user.email = anonymizedEmail;
    user.phone = `+0000000${anonymizedHash.slice(0, 5)}`;
    user.avatar = null;
    user.refreshToken = null;
    user.isDeleted = true;
    await user.save({ session });

    // 2. Anonymize Review author references if present
    await Review.updateMany(
      { user: userId },
      { $set: { comment: "[Content removed under GDPR Article 17 Right to Erasure]" } },
      { session }
    );

    // 3. Record Cryptographic SI10 Audit Event
    await recordAuditLog(
      {
        actor: requestedBy || userId,
        actorRole: "compliance_engine",
        ipAddress,
        userAgent,
        action: "GDPR_DATA_ERASURE",
        targetResource: "User",
        targetId: userId.toString(),
        changes: { field: "PII", status: "anonymized" },
      },
      session
    );

    // 4. Create CloudEvent for downstream services
    const event = createCloudEvent({
      type: "compliance.gdpr_erasure_completed",
      source: "salonnow.compliance",
      subject: userId.toString(),
      data: { userId: userId.toString(), anonymizedEmail },
    });

    logger.info({ userId, eventId: event.id }, "[Compliance] GDPR Erasure completed successfully");
    return { success: true, anonymizedEmail, event };
  });
};
