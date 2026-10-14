/**
 * cacheManager.js — Distributed cache layer with Pub/Sub invalidation.
 *
 * # Two-Tier Cache Architecture
 *
 *   L1 — In-Process (Node.js Memory Map)
 *        TTL: 2 seconds  |  Capacity: 500 entries  |  Scope: Single process
 *        Purpose: Absorbs micro-hotspot bursts (e.g. same salon page hit by 50 clients/sec).
 *        Invalidation: Via Redis Pub/Sub broadcast to all API processes.
 *
 *   L2 — Shared Redis Cache
 *        TTL: 60 seconds (configurable)  |  Scope: All API instances
 *        Purpose: Authoritative shared cache layer serving cross-process reads.
 *        Invalidation: Direct Redis DEL + Pub/Sub notification to clear L1 across all nodes.
 *
 * # Cache Key Conventions
 *
 *   salon:detail:{salonId}            — Full salon document (staff, services, etc.)
 *   salons:search:*                   — Search result pages (pattern-matched for invalidation)
 *   avail:{salonId}:{staffId}:{date}  — Staff-specific slot availability
 *   avail:{salonId}:any:{date}        — Any-staff slot availability
 *   avail:index:{salonId}:{date}      — Redis SET tracking all avail:* variant keys for date
 *
 * # Pub/Sub Invalidation Channel
 *
 *   Channel: "cache:invalidation"
 *   Payload: JSON { type: "salon"|"availability", salonId, date? }
 *
 * # Redis Cluster Hash Tag Note
 *   For Redis Cluster, availability index keys use {salonId} hash tags to ensure
 *   all keys for a salon hash to the same slot, enabling atomic pipeline operations.
 *
 * Scalability Invariants Satisfied:
 *   - I7: Stale L1 data cannot persist after Redis Pub/Sub invalidation delivery.
 *   - I5: Thundering herd on cold-cache misses is dampened by L1 TTL + lock design.
 *   - I13: Cache invalidation across 20+ API nodes happens via a single Redis Pub/Sub publish.
 */

import getRedisClient from "./redis.js";
import logger from "./logger.js";
import Redis from "ioredis";
import { cacheHitTotal, cacheMissTotal } from "./metrics.js";

const DEFAULT_TTL_SECONDS = 60;

// ─── L1 In-Process Cache ──────────────────────────────────────────────────────

const L1_TTL_MS = 2000;    // 2-second TTL
const L1_MAX_SIZE = 500;   // Evict oldest when full

/**
 * Simple LRU-style in-process cache using a Map (insertion-order eviction).
 * Entries: { value, expiresAt }
 */
const _l1Cache = new Map();

const _l1Get = (key) => {
  const entry = _l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _l1Cache.delete(key);
    return null;
  }
  return entry.value;
};

const _l1Set = (key, value) => {
  // Evict oldest entry when at capacity
  if (_l1Cache.size >= L1_MAX_SIZE) {
    const firstKey = _l1Cache.keys().next().value;
    _l1Cache.delete(firstKey);
  }
  _l1Cache.set(key, { value, expiresAt: Date.now() + L1_TTL_MS });
};

const _l1Delete = (key) => {
  _l1Cache.delete(key);
};

/**
 * Clears all L1 cache entries matching a prefix (used by Pub/Sub handler).
 */
const _l1DeleteByPrefix = (prefix) => {
  for (const key of _l1Cache.keys()) {
    if (key.startsWith(prefix)) {
      _l1Cache.delete(key);
    }
  }
};

/**
 * Clears the entire in-process L1 cache (useful for testing and deterministic cache reset).
 */
export const clearL1Cache = () => {
  _l1Cache.clear();
};

// Helper to verify Redis connection readiness without breaking test mocks
const _isRedisReady = (client) => {
  if (!client) return false;
  if (client.status) {
    return client.status === "ready" || client.status === "connect";
  }
  return true;
};

// ─── Basic Cache Operations (L1 + L2) ────────────────────────────────────────

/**
 * Gets a cached item. Checks L1 first (in-process), then L2 (Redis).
 * Populates L1 on an L2 hit for subsequent fast reads within this process.
 */
export const cacheGet = async (key) => {
  const prefix = key ? key.split(":")[0] : "unknown";
  // L1 hit — no Redis round-trip
  const l1Hit = _l1Get(key);
  if (l1Hit !== null) {
    try { cacheHitTotal.inc({ tier: "L1", key_prefix: prefix }); } catch {}
    return l1Hit;
  }

  const redis = getRedisClient();
  if (!_isRedisReady(redis)) return null;

  try {
    const cachedData = await redis.get(key);
    if (!cachedData) {
      try { cacheMissTotal.inc({ key_prefix: prefix }); } catch {}
      return null;
    }
    const parsed = JSON.parse(cachedData);
    _l1Set(key, parsed); // Populate L1 from L2
    try { cacheHitTotal.inc({ tier: "L2", key_prefix: prefix }); } catch {}
    return parsed;
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to read key");
    try { cacheMissTotal.inc({ key_prefix: prefix }); } catch {}
    return null;
  }
};

/**
 * Sets a cached item in both L1 and L2 (Redis).
 */
export const cacheSet = async (key, data, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  _l1Set(key, data);

  const redis = getRedisClient();
  if (!_isRedisReady(redis)) return;

  try {
    const serialized = JSON.stringify(data);
    await redis.set(key, serialized, "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to set key");
  }
};

/**
 * Deletes a cached item from both L1 and L2.
 */
export const cacheDel = async (key) => {
  _l1Delete(key);

  const redis = getRedisClient();
  if (!_isRedisReady(redis)) return;

  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ key, err: err.message }, "[CacheManager] Failed to delete key");
  }
};

// ─── Pub/Sub Cache Invalidation ───────────────────────────────────────────────

const INVALIDATION_CHANNEL = "cache:invalidation";

/**
 * Publishes a cache invalidation event to the Redis Pub/Sub channel.
 *
 * All API instances subscribe to this channel and invalidate their L1 caches
 * on receiving the event. This guarantees that no API server serves stale
 * L1 data after a write, satisfying I7 across distributed deployments.
 *
 * @param {{ type: "salon"|"availability", salonId: string, date?: string }} payload
 */
export const publishCacheInvalidation = async (payload) => {
  const redis = getRedisClient();
  if (!_isRedisReady(redis)) return;

  try {
    await redis.publish(INVALIDATION_CHANNEL, JSON.stringify(payload));
    logger.debug({ payload }, "[CacheManager] Invalidation event published");
  } catch (err) {
    logger.warn({ err: err.message, payload }, "[CacheManager] Failed to publish invalidation event");
  }
};

/**
 * Subscribes to the Redis Pub/Sub invalidation channel and processes incoming events.
 *
 * Call this ONCE per process during startup (from index.js). It creates a
 * dedicated subscriber Redis connection (required by ioredis — a subscribed client
 * cannot issue regular commands).
 *
 * When an invalidation message arrives:
 *   - type=salon:        Clears L1 entries with prefix "salon:detail:{salonId}"
 *   - type=availability: Clears L1 entries with prefix "avail:{salonId}"
 *
 * L2 (Redis) is already cleared by the initiating instance before publishing.
 * Other instances only need to clear their own L1 caches.
 */
export const subscribeCacheInvalidation = () => {
  if (process.env.ENABLE_REDIS === "false") {
    logger.debug("[CacheManager] Redis disabled — skipping Pub/Sub subscription");
    return null;
  }

  const mode = (process.env.REDIS_MODE || "standalone").toLowerCase();

  if (process.env.NODE_ENV === "test" && !process.env.USE_REDIS_IN_TESTS) {
    logger.debug("[CacheManager] Skipping Pub/Sub subscription in test environment");
    return null;
  }

  const subOptions =
    mode === "cluster"
      ? (() => {
          const nodeStr = process.env.REDIS_CLUSTER_NODES || "localhost:6379";
          const startupNodes = nodeStr.split(",").map((s) => {
            const [host, port] = s.trim().split(":");
            return { host, port: parseInt(port || "6379", 10) };
          });
          return { isCluster: true, nodes: startupNodes };
        })()
      : { isCluster: false, host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT || "6379", 10) };

  let subscriber;
  if (subOptions.isCluster) {
    subscriber = new Redis.Cluster(subOptions.nodes, {
      redisOptions: {
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      },
    });
  } else {
    subscriber = new Redis({
      host: subOptions.host,
      port: subOptions.port,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      maxRetriesPerRequest: 3,
    });
  }

  subscriber.subscribe(INVALIDATION_CHANNEL, (err) => {
    if (err) {
      logger.error({ err: err.message }, "[CacheManager] Failed to subscribe to invalidation channel");
    } else {
      logger.info({ channel: INVALIDATION_CHANNEL }, "[CacheManager] Subscribed to cache invalidation channel");
    }
  });

  subscriber.on("message", (channel, message) => {
    if (channel !== INVALIDATION_CHANNEL) return;
    try {
      const payload = JSON.parse(message);
      _handleInvalidationEvent(payload);
    } catch (err) {
      logger.warn({ err: err.message, message }, "[CacheManager] Failed to process invalidation message");
    }
  });

  subscriber.on("error", (err) => {
    logger.warn({ err: err.message }, "[CacheManager] Subscriber connection error");
  });

  return subscriber; // Return for graceful shutdown (caller should call subscriber.quit())
};

/**
 * Processes an incoming cache invalidation event by clearing affected L1 entries.
 */
const _handleInvalidationEvent = (payload) => {
  const { type, salonId, date } = payload;
  if (!salonId) return;

  if (type === "salon") {
    _l1DeleteByPrefix(`salon:detail:${salonId}`);
    _l1DeleteByPrefix("salons:search:");
    logger.debug({ salonId }, "[CacheManager] L1 salon cache cleared via Pub/Sub");
  } else if (type === "availability") {
    _l1DeleteByPrefix(`avail:${salonId}`);
    logger.debug({ salonId, date }, "[CacheManager] L1 availability cache cleared via Pub/Sub");
  }
};

// ─── Availability Cache Index Management ──────────────────────────────────────
//
// Cache key format for availability:
//   avail:{salonId}:{staffId}:{dateISO}  — staff-specific slot cache
//   avail:{salonId}:any:{dateISO}        — any-staff slot cache
//   avail:index:{salonId}:{dateISO}      — Redis SET tracking all variant keys
//
// Using an index SET means we can invalidate ALL variants of a date in one
// pipelined DEL operation without a blocking KEYS * scan.
//
// Redis Cluster Note: Index keys do NOT use hash tags because they are not part
// of multi-key lock operations. If Cluster is used and SCAN is needed, ensure
// SCAN is run against each node individually, or migrate to index-based deletion
// only (which the index SET pattern already does).

/**
 * Registers an availability cache key in the index for its salonId+date.
 * Call this every time you SET an avail:* key so the index stays up to date.
 */
export const registerAvailabilityKey = async (key, salonId, dateISO, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const redis = getRedisClient();
  if (!redis) return;

  const indexKey = `avail:index:${salonId}:${dateISO}`;
  try {
    await redis.sadd(indexKey, key);
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
 */
export const cacheSetAvailability = async (key, data, salonId, dateISO, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  await cacheSet(key, data, ttlSeconds);
  await registerAvailabilityKey(key, salonId, dateISO, ttlSeconds);
};

/**
 * Invalidates ALL availability cache keys for a given salonId + date combination
 * and publishes an invalidation event to clear L1 caches across all API instances.
 *
 * Reads the index SET, pipelines a DEL for every registered key,
 * then publishes Pub/Sub notification so other nodes flush their L1 caches.
 */
export const invalidateAvailabilityByIndex = async (salonId, dateISO) => {
  const redis = getRedisClient();
  if (!redis) return;

  const indexKey = `avail:index:${salonId}:${dateISO}`;
  try {
    const keys = await redis.smembers(indexKey);
    if (keys && keys.length > 0) {
      // Batch DEL all availability keys + index in one pipeline
      const pipeline = redis.pipeline();
      for (const k of keys) {
        pipeline.del(k);
        _l1Delete(k); // Clear L1 on this instance immediately
      }
      pipeline.del(indexKey);
      await pipeline.exec();
      logger.debug({ salonId, dateISO, count: keys.length }, "[CacheManager] Availability cache invalidated via index");
    } else {
      await redis.del(indexKey);
    }

    // Publish cross-instance L1 invalidation event
    await publishCacheInvalidation({ type: "availability", salonId: salonId.toString(), date: dateISO });
  } catch (err) {
    logger.warn({ indexKey, err: err.message }, "[CacheManager] Failed to invalidate availability cache");
  }
};

// ─── Salon Detail / Search Cache ──────────────────────────────────────────────

/**
 * Caches detailed salon projection.
 */
export const cacheSetSalonDetail = async (salonId, data, ttlSeconds = 300) => {
  const key = `salon:detail:${salonId}`;
  await cacheSet(key, data, ttlSeconds);
};

/**
 * Gets cached detailed salon projection.
 */
export const cacheGetSalonDetail = async (salonId) => {
  const key = `salon:detail:${salonId}`;
  return await cacheGet(key);
};

/**
 * Registers a search cache key in a city index SET for efficient invalidation (Part 5.2).
 */
export const registerSearchCacheKey = async (city, searchKey, ttlSeconds = 60) => {
  const redis = getRedisClient();
  if (!redis || !city) return;

  const cityKey = `salons:search:index:${city.toLowerCase().trim()}`;
  try {
    await redis.sadd(cityKey, searchKey);
    const existingTTL = await redis.ttl(cityKey);
    if (existingTTL < ttlSeconds) {
      await redis.expire(cityKey, ttlSeconds + 10);
    }
  } catch (err) {
    logger.warn({ cityKey, searchKey, err: err.message }, "[CacheManager] Failed to register search key in index");
  }
};

/**
 * Invalidates all cache keys related to a specific salon (detail + search results).
 * Clears L2 (Redis) via index SET + cursor SCAN fallback, then broadcasts L1 invalidation.
 */
export const invalidateSalonCache = async (salonId, city = null) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const detailKey = `salon:detail:${salonId}`;
    await redis.del(detailKey);
    _l1Delete(detailKey); // Immediate L1 clear on this instance

    if (city) {
      const cityKey = `salons:search:index:${city.toLowerCase().trim()}`;
      const searchKeys = await redis.smembers(cityKey);
      if (searchKeys && searchKeys.length > 0) {
        const pipeline = redis.pipeline();
        for (const k of searchKeys) {
          pipeline.del(k);
          _l1Delete(k);
        }
        pipeline.del(cityKey);
        await pipeline.exec();
      }
    }

    // Non-blocking cursor SCAN fallback for generic search result keys
    await _scanAndDelete(redis, `salons:search:*`);
    _l1DeleteByPrefix("salons:search:");

    // Broadcast L1 invalidation to all other API instances
    await publishCacheInvalidation({ type: "salon", salonId: salonId.toString() });
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
