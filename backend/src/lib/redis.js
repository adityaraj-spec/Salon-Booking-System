/**
 * redis.js — Centralized Redis client factory.
 *
 * Supports three topology modes via the REDIS_MODE environment variable:
 *
 *   standalone  (default) — Single Redis node. For local dev and simple deployments.
 *   sentinel              — Redis Sentinel (ioredis Sentinel client). For HA with automatic
 *                           failover without Redis Cluster. AWS ElastiCache Multi-AZ.
 *   cluster               — Redis Cluster (sharded). For horizontal Redis scalability at
 *                           multi-million user scale. AWS ElastiCache Cluster Mode.
 *
 * BullMQ NOTE: BullMQ requires a NON-cluster ioredis client for its internal scripting.
 *              Use getBullMQRedisConnection() for all BullMQ Queue and Worker instances.
 *              It returns a fresh standalone ioredis connection configured via REDIS_URL or
 *              REDIS_HOST/PORT even when REDIS_MODE=cluster.
 *
 * Hash Tag NOTE: When REDIS_MODE=cluster, all multi-key operations (locks, pipelines,
 *                Lua scripts) MUST use hash tags like {salonId} to pin keys to the same
 *                cluster hash slot. See lib/redisLock.js for the canonical implementation.
 *
 * Scalability Invariants Satisfied:
 *   - I4: Redis cluster topology is hidden behind a single factory interface.
 *   - I8: Rate limiter, session, and cache keys share a single consistent Redis client.
 */

import Redis from "ioredis";
import logger from "./logger.js";

// ─── Singleton references ─────────────────────────────────────────────────────
let redisClient = null;
let customMockClient = null;

// ─── Test overrides ───────────────────────────────────────────────────────────
export const setMockRedisClient = (mock) => {
  customMockClient = mock;
};

export const getRedisConnectionUrl = () =>
  process.env.REDIS_URL?.trim() ||
  process.env.REDIS_CONNECTION_STRING?.trim() ||
  process.env.REDIS_URI?.trim() ||
  null;

export const getRedisTlsOptions = (connectionUrl = getRedisConnectionUrl()) => {
  const tlsEnabled =
    process.env.REDIS_TLS?.trim().toLowerCase() === "true" ||
    connectionUrl?.toLowerCase().startsWith("rediss://");

  return tlsEnabled ? { rejectUnauthorized: false } : undefined;
};

// ─── Shared retry / connection options ───────────────────────────────────────
const SHARED_OPTIONS = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying — let the calling code fail gracefully
    }
    const delay = Math.min(times * 100, 1000); // Max 1 second
    return delay;
  },
};

/**
 * Returns the shared application Redis client.
 * Creates a new client on first call (singleton pattern).
 *
 * In REDIS_MODE=cluster mode, returns an ioredis Cluster client.
 * In REDIS_MODE=sentinel mode, returns an ioredis Sentinel client.
 * In standalone mode (default), returns a plain ioredis client.
 */
export const getRedisClient = () => {
  if (customMockClient) return customMockClient;

  if (process.env.NODE_ENV === "test" && !process.env.USE_REDIS_IN_TESTS) {
    return null;
  }

  if (process.env.ENABLE_REDIS === "false") {
    return null;
  }

  if (redisClient) return redisClient;

  const mode = (process.env.REDIS_MODE || "standalone").toLowerCase();

  if (mode === "cluster") {
    redisClient = _createClusterClient();
  } else if (mode === "sentinel") {
    redisClient = _createSentinelClient();
  } else {
    redisClient = _createStandaloneClient();
  }

  _attachErrorHandlers(redisClient, mode);
  return redisClient;
};

/**
 * Returns a fresh ioredis connection config object for BullMQ.
 *
 * BullMQ requires maxRetriesPerRequest: null and does not work with ioredis Cluster
 * clients. This returns a plain standalone config pointing at REDIS_URL or REDIS_HOST/PORT.
 * When deploying Redis Cluster, REDIS_HOST should point at the cluster entry node —
 * BullMQ commands are automatically redirected via the CLUSTER REDIRECT mechanism.
 *
 * Do NOT use getRedisClient() for BullMQ — use this config object instead.
 */
export const getBullMQRedisConnection = () => {
  const connectionUrl = getRedisConnectionUrl();

  return {
    ...(connectionUrl
      ? { url: connectionUrl }
      : {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
        }),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: getRedisTlsOptions(connectionUrl),
    maxRetriesPerRequest: null, // Required by BullMQ — do not change
    enableOfflineQueue: false,
  };
};

// ─── Private topology factory functions ───────────────────────────────────────

/**
 * Standalone Redis client (single node or local dev).
 */
const _createStandaloneClient = () => {
  logger.info("[Redis] Initializing standalone client");
  const connectionUrl = getRedisConnectionUrl();
  const options = {
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    tls: getRedisTlsOptions(connectionUrl),
    ...SHARED_OPTIONS,
  };

  if (connectionUrl) return new Redis(connectionUrl, options);

  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    ...options,
  });
};

/**
 * Redis Sentinel client for High-Availability failover.
 *
 * Required environment variables:
 *   REDIS_SENTINEL_HOSTS — comma-separated "host:port" list, e.g. "s1.host:26379,s2.host:26379"
 *   REDIS_SENTINEL_MASTER_NAME — Sentinel master name, e.g. "mymaster"
 *   REDIS_PASSWORD — optional auth password for Redis nodes
 *   REDIS_SENTINEL_PASSWORD — optional auth password for Sentinel nodes themselves
 */
const _createSentinelClient = () => {
  const sentinelHostStr = process.env.REDIS_SENTINEL_HOSTS || "localhost:26379";
  const sentinels = sentinelHostStr.split(",").map((s) => {
    const [host, port] = s.trim().split(":");
    return { host, port: parseInt(port || "26379", 10) };
  });
  const name = process.env.REDIS_SENTINEL_MASTER_NAME || "mymaster";

  logger.info({ sentinels, name }, "[Redis] Initializing Sentinel client");

  return new Redis({
    sentinels,
    name,
    password: process.env.REDIS_PASSWORD || undefined,
    sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
    role: "master",
    tls: getRedisTlsOptions(),
    ...SHARED_OPTIONS,
  });
};

/**
 * Redis Cluster client for horizontal sharding across multiple nodes.
 *
 * Required environment variables:
 *   REDIS_CLUSTER_NODES — comma-separated "host:port" list of SEED cluster nodes
 *                         e.g. "node1.host:6379,node2.host:6379,node3.host:6379"
 *   REDIS_PASSWORD — optional cluster auth password
 *   REDIS_TLS — "true" to enable TLS (required for AWS ElastiCache in transit encryption)
 *
 * IMPORTANT: All multi-key operations MUST use hash tags (e.g. {salonId}) to ensure
 * keys land on the same slot. See buildSlotLockKeys() in lib/redisLock.js.
 */
const _createClusterClient = () => {
  const nodeStr = process.env.REDIS_CLUSTER_NODES || "localhost:6379";
  const startupNodes = nodeStr.split(",").map((s) => {
    const [host, port] = s.trim().split(":");
    return { host, port: parseInt(port || "6379", 10) };
  });

  logger.info({ startupNodes }, "[Redis] Initializing Cluster client");

  return new Redis.Cluster(startupNodes, {
    redisOptions: {
      password: process.env.REDIS_PASSWORD || undefined,
      tls: getRedisTlsOptions(),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    },
    clusterRetryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 150, 3000);
    },
    // Automatically follow MOVED / ASK redirects — required for cluster slot migrations
    enableOfflineQueue: false,
    slotsRefreshTimeout: 2000,
    dnsLookup: (address, callback) => callback(null, address),
  });
};

/**
 * Attaches error and reconnection event handlers to any Redis client type.
 */
const _attachErrorHandlers = (client, mode) => {
  client.on("error", (err) => {
    logger.warn({ mode, err: err.message }, "[Redis] Client error");
  });
  client.on("connect", () => {
    logger.info({ mode }, "[Redis] Client connected");
  });
  client.on("reconnecting", () => {
    logger.warn({ mode }, "[Redis] Client reconnecting");
  });
  client.on("close", () => {
    logger.warn({ mode }, "[Redis] Client connection closed");
  });
};

export default getRedisClient;
