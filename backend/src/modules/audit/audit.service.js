import { AuditLog } from "../../models/auditLog.model.js";
import crypto from "crypto";
import logger from "../../lib/logger.js";

/**
 * Computes SHA-256 block hash for an audit log entry.
 */
export const computeAuditHash = ({ actor, actorRole, action, targetResource, targetId, timestamp, previousHash, changes }) => {
  const payload = `${actor}:${actorRole}:${action}:${targetResource}:${targetId}:${new Date(timestamp).toISOString()}:${previousHash}:${JSON.stringify(changes || {})}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
};

/**
 * Records an immutable, cryptographically-chained SI10 compliance audit record.
 */
export const recordAuditLog = async (logData, session = null) => {
  const options = session ? { session } : {};
  
  // Retrieve previous block hash for chain linking
  const lastEntry = await AuditLog.findOne({}, { hash: 1 }).sort({ _id: -1 }).lean();
  const previousHash = lastEntry?.hash || "0000000000000000000000000000000000000000000000000000000000000000";
  
  const timestamp = logData.timestamp || new Date();
  
  const currentHash = computeAuditHash({
    ...logData,
    timestamp,
    previousHash,
  });

  const auditRecord = await AuditLog.create(
    [
      {
        ...logData,
        timestamp,
        previousHash,
        hash: currentHash,
      },
    ],
    options
  );

  logger.info(
    { action: logData.action, targetResource: logData.targetResource, targetId: logData.targetId, hash: currentHash },
    "[AuditLog] Cryptographic audit record created (SI10)"
  );

  return auditRecord[0];
};

/**
 * Verifies audit log chain integrity (SOC2 / ISO27001 compliance audit check).
 */
export const verifyAuditChainIntegrity = async (limit = 100) => {
  const records = await AuditLog.find({}).sort({ _id: 1 }).limit(limit).lean();
  let isValid = true;
  let brokenIndex = -1;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (i > 0) {
      const prev = records[i - 1];
      if (rec.previousHash !== prev.hash) {
        isValid = false;
        brokenIndex = i;
        break;
      }
    }
    const recomputed = computeAuditHash(rec);
    if (rec.hash && rec.hash !== recomputed) {
      isValid = false;
      brokenIndex = i;
      break;
    }
  }

  return { isValid, totalVerified: records.length, brokenIndex };
};
