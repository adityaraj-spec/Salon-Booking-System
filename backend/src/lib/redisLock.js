import { redisClient } from "./redis.js";
import { v4 as uuidv4 } from "uuid";
import logger from "./logger.js";

/**
 * Lua script for atomic compare-and-delete (safe lock release).
 * Only deletes the key if its value matches the caller's token —
 * prevents releasing a lock owned by another request after TTL self-heal.
 */
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

const LOCK_TTL_MS = 8000; // 8 seconds — covers worst-case transaction retry budget

/**
 * Converts a Date to a 15-minute ISO slot bucket string.
 * e.g. "2024-08-01T14:30" for any time between 14:30 and 14:44.
 */
const toSlotBucket = (date) => {
  const d = new Date(date);
  const minutes = Math.floor(d.getUTCMinutes() / 15) * 15;
  return `${d.toISOString().slice(0, 13)}:${String(minutes).padStart(2, "0")}`;
};

/**
 * Build the set of Redis lock keys for a booking spanning [startTime, endTime).
 * Keys are sorted lexicographically to prevent circular-wait deadlocks.
 *
 * @param {string} salonId
 * @param {string|null} staffId - null for any-staff bookings
 * @param {Date} startTime
 * @param {Date} endTime
 * @returns {string[]} sorted array of lock keys
 */
export const buildSlotLockKeys = (salonId, staffId, startTime, endTime) => {
  const staff = staffId ? staffId.toString() : "any";
  const keys = new Set();

  const cursor = new Date(startTime);
  while (cursor < endTime) {
    keys.add(`lock:hold:${salonId}:${staff}:${toSlotBucket(cursor)}`);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 15);
  }

  return [...keys].sort();
};

/**
 * Acquires all slot lock buckets in sorted order (all-or-nothing).
 *
 * If any bucket cannot be acquired, all previously acquired buckets for this
 * attempt are immediately released before returning.
 *
 * @param {string[]} lockKeys - sorted lock key array from buildSlotLockKeys
 * @param {number} [ttlMs] - lock TTL in milliseconds (default: 8000)
 * @returns {{ acquired: boolean, token: string|null, keys: string[] }}
 */
export const acquireSlotLock = async (lockKeys, ttlMs = LOCK_TTL_MS) => {
  const token = uuidv4();
  const acquired = [];

  try {
    for (const key of lockKeys) {
      // SET key token NX PX ttlMs — atomic, returns "OK" or null
      const result = await redisClient.set(key, token, "NX", "PX", ttlMs);
      if (result === null) {
        // Contention detected — release everything already acquired this pass
        await _releaseKeys(acquired, token);
        logger.debug({ key, lockKeys }, "[RedisLock] Slot contended — lock NOT acquired");
        return { acquired: false, token: null, keys: [] };
      }
      acquired.push(key);
    }

    logger.debug({ lockKeys, token }, "[RedisLock] Slot lock acquired");
    return { acquired: true, token, keys: acquired };
  } catch (err) {
    // Redis connectivity error — fail-closed: do NOT proceed without the lock
    await _releaseKeys(acquired, token).catch(() => {});
    logger.error({ err: err.message, lockKeys }, "[RedisLock] Redis error during lock acquisition");
    throw Object.assign(new Error("Lock service unavailable"), { code: "LOCK_SERVICE_UNAVAILABLE" });
  }
};

/**
 * Releases all lock keys that this request owns.
 * Uses the Lua CAS script so only keys whose value matches our token are deleted.
 * Safe to call multiple times (idempotent).
 *
 * @param {string[]} keys
 * @param {string} token
 */
export const releaseSlotLock = async (keys, token) => {
  if (!keys || keys.length === 0 || !token) return;
  await _releaseKeys(keys, token);
};

// Internal helper — executes Lua CAS delete on each key
const _releaseKeys = async (keys, token) => {
  if (!keys || keys.length === 0) return;
  try {
    await Promise.all(
      keys.map((key) => redisClient.eval(RELEASE_SCRIPT, 1, key, token))
    );
    logger.debug({ keys, token }, "[RedisLock] Slot lock released");
  } catch (err) {
    // Log and swallow — TTL self-heal is the backstop
    logger.warn({ err: err.message, keys }, "[RedisLock] Error releasing lock (TTL will self-heal)");
  }
};
