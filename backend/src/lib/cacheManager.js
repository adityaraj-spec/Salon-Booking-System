import getRedisClient from "./redis.js";

const DEFAULT_TTL_SECONDS = 60;

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
    console.warn(`[CacheManager] Failed to read key "${key}":`, err.message);
    return null;
  }
};

/**
 * Sets a cached item by key in Redis with a TTL in seconds.
 */
export const cacheSet = async (key, data, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const serialized = JSON.stringify(data);
    await redis.set(key, serialized, "EX", ttlSeconds);
  } catch (err) {
    console.warn(`[CacheManager] Failed to set key "${key}":`, err.message);
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
    console.warn(`[CacheManager] Failed to delete key "${key}":`, err.message);
  }
};

/**
 * Invalidates all cache keys related to a specific salon.
 */
export const invalidateSalonCache = async (salonId) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`salon:detail:${salonId}`);
    const keys = await redis.keys(`salons:search:*`);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn(`[CacheManager] Failed to invalidate salon cache for ${salonId}:`, err.message);
  }
};
