import getRedisClient from "./redis.js";
import crypto from "crypto";
import logger from "./logger.js";

/**
 * Lua script for atomic compare-and-delete (safe lock release).
 */
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

/**
 * Lua script for atomic lock extension (watchdog timer).
 * Renews TTL for all specified lock keys IF they are still owned by this token.
 */
const EXTEND_SCRIPT = `
local extended = 0
for i, key in ipairs(KEYS) do
  if redis.call("GET", key) == ARGV[1] then
    redis.call("PEXPIRE", key, ARGV[2])
    extended = extended + 1
  end
end
return extended
`;

const LOCK_TTL_MS = 8000; // 8 seconds
const WATCHDOG_INTERVAL_MS = 3000; // renew every 3 seconds

/**
 * UTC Normalization for 15-minute slot buckets.
 * Explicitly uses getUTCFullYear(), getUTCMonth(), getUTCDate(), getUTCHours(), getUTCMinutes()
 * to prevent system timezone drift across servers.
 *
 * @param {Date|string|number} date
 * @returns {string} e.g. "2026-08-01T14:30"
 */
export const toSlotBucket = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "invalid";

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(Math.floor(d.getUTCMinutes() / 15) * 15).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Build the set of Redis lock keys for a booking spanning [startTime, endTime).
 * Keys are sorted lexicographically to prevent circular-wait deadlocks.
 */
export const buildSlotLockKeys = (salonId, staffId, startTime, endTime) => {
  const staff = staffId ? staffId.toString() : "any";
  const keys = new Set();

  const cursor = new Date(startTime);
  const end = new Date(endTime);

  while (cursor < end) {
    keys.add(`lock:hold:${salonId}:${staff}:${toSlotBucket(cursor)}`);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 15);
  }

  return [...keys].sort();
};

/**
 * Starts a background watchdog interval that extends lock TTL every `intervalMs`
 * as long as the lock remains held.
 */
export const startLockWatchdog = (keys, token, ttlMs = LOCK_TTL_MS, intervalMs = WATCHDOG_INTERVAL_MS) => {
  if (!keys || keys.length === 0 || !token) return () => {};

  let active = true;
  const intervalId = setInterval(async () => {
    if (!active) return;
    try {
      const redis = getRedisClient();
      if (!redis) return;
      const extendedCount = await redis.eval(
        EXTEND_SCRIPT,
        keys.length,
        ...keys,
        token,
        ttlMs.toString()
      );
      logger.debug({ keysCount: keys.length, extendedCount, token }, "[RedisLock] Lock TTL extended by watchdog");
    } catch (err) {
      logger.warn({ err: err.message, keys }, "[RedisLock] Watchdog failed to extend lock TTL");
    }
  }, intervalMs);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

/**
 * Acquires all slot lock buckets in sorted order (all-or-nothing), and automatically
 * starts a watchdog timer to keep the lock renewed during long operations.
 */
export const acquireSlotLock = async (lockKeys, ttlMs = LOCK_TTL_MS) => {
  const redis = getRedisClient();
  if (!redis) {
    logger.error({ lockKeys }, "[RedisLock] Redis client unavailable — failing closed");
    throw Object.assign(new Error("Lock service unavailable"), { code: "LOCK_SERVICE_UNAVAILABLE" });
  }

  const token = crypto.randomUUID();
  const acquired = [];

  try {
    for (const key of lockKeys) {
      const result = await redis.set(key, token, "NX", "PX", ttlMs);
      if (result === null) {
        await _releaseKeys(redis, acquired, token);
        logger.debug({ key, lockKeys }, "[RedisLock] Slot lock contended");
        return { acquired: false, token: null, keys: [], stopWatchdog: () => {} };
      }
      acquired.push(key);
    }

    const stopWatchdog = startLockWatchdog(acquired, token, ttlMs);

    logger.debug({ lockKeys, token }, "[RedisLock] Slot lock acquired with watchdog");
    return { acquired: true, token, keys: acquired, stopWatchdog };
  } catch (err) {
    await _releaseKeys(redis, acquired, token).catch(() => {});
    logger.error({ err: err.message, lockKeys }, "[RedisLock] Redis lock acquisition error");
    throw Object.assign(new Error("Lock service unavailable"), { code: "LOCK_SERVICE_UNAVAILABLE" });
  }
};

/**
 * Releases all lock keys that this request owns and stops the watchdog.
 */
export const releaseSlotLock = async (keys, token, stopWatchdog) => {
  if (typeof stopWatchdog === "function") {
    stopWatchdog();
  }
  if (!keys || keys.length === 0 || !token) return;
  const redis = getRedisClient();
  if (redis) {
    await _releaseKeys(redis, keys, token);
  }
};

const _releaseKeys = async (redis, keys, token) => {
  if (!redis || !keys || keys.length === 0) return;
  try {
    await Promise.all(
      keys.map((key) => redis.eval(RELEASE_SCRIPT, 1, key, token))
    );
    logger.debug({ keys, token }, "[RedisLock] Slot lock released");
  } catch (err) {
    logger.warn({ err: err.message, keys }, "[RedisLock] Error releasing lock (TTL will self-heal)");
  }
};
