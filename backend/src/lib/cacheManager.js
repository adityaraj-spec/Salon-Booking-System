import getRedisClient from "./redis.js";
import logger from "./logger.js";

const DEFAULT_TTL_SECONDS = 60;

// ─── Basic cache operations ───────────────────────────────────────────────────

/**
 * Gets a cached item by key from Redis.
 */
export const cacheGet = async (key) => {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cachedData = await redis.get(key);
    if (!cachedData) return null;
    return JSON.parse(cachedData);
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to read key");
    return null;
  }
};

/**
 * Sets a cached item by key in Redis with a TTL in seconds.
 * Also registers the key in the availability index for its salonId+date if applicable.
 */
export const cacheSet = async (key, data, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const serialized = JSON.stringify(data);
    await redis.set(key, serialized, "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to set key");
  }
};

/**
 * Deletes a cached item by key from Redis.
 */
export const cacheDel = async (key) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to delete key");
  }
};

// ─── Availability cache index management ─────────────────────────────────────
//
// Cache key format for availability:
//   avail:{salonId}:{staffId}:{dateISO}   — staff-specific slot cache
//   avail:{salonId}:any:{dateISO}          — any-staff slot cache
//   avail:index:{salonId}:{dateISO}        — Redis SET tracking all variant keys
//
// Using an index SET means we can invalidate ALL variants of a date in one
// pipelined DEL operation without a blocking KEYS * scan.

/**
 * Registers an availability cache key in the index for its salonId+date.
 * Call this every time you SET an avail:* key so the index stays up to date.
 *
 * @param {string} key - the avail:* cache key being registered
 * @param {string} salonId
 * @param {string} dateISO - "YYYY-MM-DD"
 * @param {number} ttlSeconds - TTL to apply to the index entry (match the key's TTL)
 */
export const registerAvailabilityKey = async (key, salonId, dateISO, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = getRedisClient();
  if (!redis) return;

  const indexKey = `avail:index:${salonId}:${dateISO}`;
  try {
    // Add to the index set and extend its TTL to at least match the key's TTL
    await redis.sadd(indexKey, key);
    // Extend TTL of the index to match (or exceed) the key — use max(existing, ttlSeconds)
    const existingTTL = await redis.ttl(indexKey);
    if (existingTTL < ttlSeconds) {
      await redis.expire(indexKey, ttlSeconds + 10); // slight buffer
    }
  } catch (err) {
    logger.warn({ indexKey, key, err: err.message }, "[CacheManager] Failed to register availability key in index");
  }
};

/**
 * Sets an availability cache entry AND registers it in the index.
 * Use this instead of raw cacheSet() for all avail:* keys.
 *
 * @param {string} key
 * @param {object} data
 * @param {string} salonId
 * @param {string} dateISO
 * @param {number} [ttlSeconds]
 */
export const cacheSetAvailability = async (key, data, salonId, dateISO, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  await cacheSet(key, data, ttlSeconds);
  await registerAvailabilityKey(key, salonId, dateISO, ttlSeconds);
};

/**
 * Invalidates ALL availability cache keys for a given salonId + date combination
 * by reading the index SET, then pipelining a DEL for every registered key.
 *
 * This replaces the old blocking redis.keys('salons:search:*') pattern entirely.
 *
 * @param {string} salonId
 * @param {string} dateISO - "YYYY-MM-DD"
 */
export const invalidateAvailabilityByIndex = async (salonId, dateISO) => {
  const redis = getRedisClient();
  if (!redis) return;

  const indexKey = `avail:index:${salonId}:${dateISO}`;
  try {
    const keys = await redis.smembers(indexKey);
    if (keys && keys.length > 0) {
      // Delete all cached availability keys plus the index itself in one pipeline
      const pipeline = redis.pipeline();
      for (const k of keys) pipeline.del(k);
      pipeline.del(indexKey);
      await pipeline.exec();
      logger.debug({ salonId, dateISO, count: keys.length }, "[CacheManager] Availability cache invalidated via index");
    } else {
      // Index is empty — just clean it up
      await redis.del(indexKey);
    }
  } catch (err) {
    logger.warn({ indexKey, err: err.message }, "[CacheManager] Failed to invalidate availability cache");
  }
};

// ─── Salon detail / search cache ─────────────────────────────────────────────

/**
 * Invalidates all cache keys related to a specific salon.
 * Uses a Redis SCAN (non-blocking cursor) for search result keys.
 */
export const invalidateSalonCache = async (salonId) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`salon:detail:${salonId}`);
    // Non-blocking SCAN instead of KEYS * to avoid blocking Redis event loop
    await _scanAndDelete(redis, `salons:search:*`);
  } catch (err) {
    logger.warn({ salonId, err: err.message }, "[CacheManager] Failed to invalidate salon cache");
  }
};

/**
 * Cursor-based SCAN + DEL — non-blocking alternative to redis.keys().
 * Deletes all keys matching the pattern in batches of 100.
 */
const _scanAndDelete = async (redis, pattern) => {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys && keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const k of keys) pipeline.del(k);
      await pipeline.exec();
    }
  } while (cursor !== "0");
};
