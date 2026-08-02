/**
 * redisLock.js — Distributed slot-level locking for concurrent booking safety.
 *
 * # Redis Cluster Hash Tag Strategy (S7 Fix)
 *
 * Redis Cluster distributes keys across 16,384 hash slots using CRC16({key}).
 * Multi-key operations (MSET, pipelines, Lua scripts with multiple KEYS[]) require
 * ALL keys to reside on the SAME hash slot — otherwise Redis throws:
 *   CROSSSLOT Keys in request don't hash to the same slot
 *
 * FIX: All slot lock keys for a given booking share the salon as their hash tag:
 *   Before: `lock:hold:{salonId}:{staff}:{slotBucket}`
 *   After:  `{salonId}:lock:hold:{staff}:{slotBucket}`
 *
 * Redis Cluster computes CRC16 on the text BETWEEN the FIRST pair of {braces}.
 * All keys for the same salonId therefore hash to the same slot, making pipeline
 * and Lua eval operations legal and atomic within the cluster.
 *
 * Correctness Guarantees:
 *   - I2: Atomic NX set prevents two API servers from acquiring the same slot simultaneously.
 *   - I4: Redis Cluster hash tags ensure multi-key lock operations remain on one slot.
 *   - I6: Watchdog timer prevents locks from expiring during long-running transactions.
 *   - I11: Sorted key acquisition order prevents circular-wait deadlocks across instances.
 */

import getRedisClient from "./redis.js";
import crypto from "crypto";
import logger from "./logger.js";

// ─── Lua Scripts (Atomic Operations) ──────────────────────────────────────────

/**
 * Atomic compare-and-delete for safe lock release.
 * Only deletes the key if the stored value matches our ownership token.
 * Prevents a race where our lock expired and was re-acquired by another process.
 */
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

/**
 * Atomic lock extension for watchdog timer.
 * Renews TTL for all specified lock keys only if they are still owned by this token.
 * Returns count of successfully extended locks.
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

// ─── Lock Configuration ───────────────────────────────────────────────────────
const LOCK_TTL_MS = 8000;       // 8 seconds initial lock TTL
const WATCHDOG_INTERVAL_MS = 3000; // Renew every 3 seconds (well before expiry)

// ─── UTC Slot Bucketing ───────────────────────────────────────────────────────

/**
 * UTC Normalization for 15-minute slot buckets.
 *
 * Uses getUTCFullYear/Month/Date/Hours/Minutes explicitly to prevent system
 * timezone drift across servers in different geographic regions or time zones.
 *
 * Two API servers in UTC+0 and UTC+5:30 will compute identical slot bucket
 * strings for the same absolute moment in time, preventing split-brain locking.
 *
 * @param {Date|string|number} date
 * @returns {string} e.g. "2026-08-01T14:30"
 */
export const toSlotBucket = (date) => {
  if (!date) return "invalid";
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
 * Builds the set of Redis lock keys for a booking spanning [startTime, endTime).
 *
 * KEY FORMAT (S7 Fix — Redis Cluster Hash Tag):
 *   {salonId}:lock:hold:{staff}:{slotBucket}
 *
 * The hash tag {salonId} wraps the salonId, ensuring CRC16 is computed on
 * the salonId portion. All slot keys for a booking hash to the same cluster slot,
 * making multi-key Lua eval and pipeline operations safe in Redis Cluster.
 *
 * Keys are sorted lexicographically to prevent circular-wait deadlocks when
 * multiple concurrent requests try to acquire overlapping slot ranges.
 *
 * @param {string} salonId
 * @param {string|null} staffId — null or "any" means no staff preference
 * @param {Date|string} startTime
 * @param {Date|string} endTime
 * @returns {string[]} Sorted array of lock key strings
 */
export const buildSlotLockKeys = (salonId, staffId, startTime, endTime) => {
  const staff = staffId ? staffId.toString() : "any";
  const keys = new Set();

  const cursor = new Date(startTime);
  const end = new Date(endTime);

  while (cursor < end) {
    // Hash tag wraps salonId so all keys for this salon hash to the same cluster slot
    keys.add(`{${salonId}}:lock:hold:${staff}:${toSlotBucket(cursor)}`);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 15);
  }

  return [...keys].sort();
};

// ─── Watchdog Timer ───────────────────────────────────────────────────────────

/**
 * Starts a background watchdog interval that extends lock TTL every `intervalMs`.
 *
 * This ensures long-running transactions (DB writes, Razorpay calls) don't lose
 * their lock due to clock drift or slow network I/O — the watchdog keeps renewing
 * the lock as long as the operation is in progress.
 *
 * Returns a stop function — call it when the operation completes to kill the interval.
 */
export const startLockWatchdog = (keys, token, ttlMs = LOCK_TTL_MS, intervalMs = WATCHDOG_INTERVAL_MS) => {
  if (!keys || keys.length === 0 || !token) return () => {};

  let active = true;
  const intervalId = setInterval(async () => {
    if (!active) return;
    try {
      const redis = getRedisClient();
      if (!redis) return;

      // NOTE: For Redis Cluster, all keys must share a hash tag (guaranteed by buildSlotLockKeys).
      // ioredis Cluster will route this EVALSHA to the correct slot automatically.
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

// ─── Lock Acquisition ─────────────────────────────────────────────────────────

/**
 * Acquires all slot lock buckets in sorted key order (all-or-nothing).
 *
 * Implementation guarantees:
 *   - All keys acquired with NX (set-if-not-exists) — atomic per key.
 *   - Keys acquired in sorted order — prevents circular-wait deadlock (dining philosophers).
 *   - On partial acquisition failure, all held keys are immediately released.
 *   - Watchdog timer started on success to prevent TTL expiry during long ops.
 *   - Redis unavailability throws LOCK_SERVICE_UNAVAILABLE — fail-closed behavior.
 *
 * @param {string[]} lockKeys — sorted lock key array from buildSlotLockKeys()
 * @param {number} [ttlMs] — lock TTL in milliseconds
 * @returns {{ acquired: boolean, token: string|null, keys: string[], stopWatchdog: Function }}
 */
const testMutexes = new Map();

const _acquireTestMutex = async (keys) => {
  const token = crypto.randomUUID();
  while (true) {
    let contended = false;
    for (const key of keys) {
      if (testMutexes.has(key)) {
        contended = true;
        break;
      }
    }
    if (!contended) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  for (const key of keys) {
    testMutexes.set(key, token);
  }
  return {
    token,
    release: () => {
      for (const key of keys) {
        if (testMutexes.get(key) === token) {
          testMutexes.delete(key);
        }
      }
    },
  };
};

export const acquireSlotLock = async (lockKeys, ttlMs = LOCK_TTL_MS) => {
  const redis = getRedisClient();
  if (!redis) {
    if (process.env.NODE_ENV === "test") {
      const { token, release } = await _acquireTestMutex(lockKeys);
      logger.debug({ lockKeys, token }, "[RedisLock] Test mode async mutex acquired");
      return { acquired: true, token, keys: lockKeys, stopWatchdog: release };
    }
    logger.error({ lockKeys }, "[RedisLock] Redis client unavailable — failing closed");
    throw Object.assign(
      new Error("Lock service unavailable"),
      { code: "LOCK_SERVICE_UNAVAILABLE" }
    );
  }

  const token = crypto.randomUUID();
  const acquired = [];

  try {
    for (const key of lockKeys) {
      const result = await redis.set(key, token, "NX", "PX", ttlMs);
      if (result === null) {
        // Another instance holds this slot — release all acquired locks and abort
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
    // Ensure we don't leave orphaned locks if Redis errors mid-acquisition
    await _releaseKeys(redis, acquired, token).catch(() => {});
    logger.error({ err: err.message, lockKeys }, "[RedisLock] Redis lock acquisition error");
    throw Object.assign(
      new Error("Lock service unavailable"),
      { code: "LOCK_SERVICE_UNAVAILABLE" }
    );
  }
};

// ─── Lock Release ─────────────────────────────────────────────────────────────

/**
 * Releases all lock keys owned by this request and stops the watchdog timer.
 *
 * Safe to call even if lock was never acquired (no-op). Self-healing via TTL
 * as a fallback if release fails (e.g. Redis crash) — I6 guarantee.
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

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Atomically releases lock keys by compare-and-delete Lua script.
 * Silently ignores keys we no longer own (they expired and were re-acquired).
 */
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
