/**
 * socket.js — Socket.io server with Redis Adapter for multi-server broadcasting.
 *
 * # Problem: In-Memory Socket.io (S2)
 *
 * Without a Redis Adapter, Socket.io stores socket room memberships in process memory.
 * When a user connects to API Server 1 and a booking is confirmed on API Server 2,
 * Server 2's call to io.to(userId).emit() only checks its own local room map.
 * The user's socket is on Server 1 — they never receive the notification.
 *
 * # Solution: @socket.io/redis-adapter
 *
 * The Redis Adapter attaches to the Socket.io server and intercepts all
 * io.emit() / io.to(room).emit() calls, publishing them to a shared Redis
 * Pub/Sub channel. Every Socket.io server process subscribes to this channel
 * and forwards the event to matching sockets in its own local room map.
 *
 * Result: Any API server can emit to any user's socket, regardless of which
 * server holds the WebSocket connection.
 *
 * # Redis Connection Pairs
 *
 * The Redis Adapter requires TWO Redis connections per process:
 *   - pubClient: Used to PUBLISH events to the shared channel
 *   - subClient: Used to SUBSCRIBE to events from other servers
 *
 * Both must be DEDICATED connections (not shared with app cache/lock clients)
 * because a subscribed ioredis client cannot issue regular commands.
 *
 * # Topology
 *
 *   API Server 1 (pubClient) ──► Redis Pub/Sub Channel ──► API Server 2 (subClient)
 *   API Server 2 (pubClient) ──► Redis Pub/Sub Channel ──► API Server 1 (subClient)
 *
 * # Connection Draining (Graceful Shutdown)
 *
 * shutdownSocketServer() closes the io server (forcing WebSocket disconnects)
 * and then quits the pub/sub Redis connections. Call this from gracefulShutdown()
 * before closing MongoDB connections.
 *
 * Scalability Invariants Satisfied:
 *   - I5: Socket.io events are broadcast correctly across any number of API server instances.
 *   - I1: WebSocket connections can be load-balanced across multiple API servers (via ALB sticky
 *         session or NGINX ip_hash routing for the initial handshake).
 *   - I11: Graceful shutdown disconnects sockets cleanly before process termination.
 */

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import logger from "./lib/logger.js";

let io = null;
let pubClient = null;
let subClient = null;

// ─── Redis connection factory (for pub/sub pair) ──────────────────────────────

/**
 * Creates a Redis connection suitable for Socket.io pub/sub adapter use.
 * Supports all three REDIS_MODE topologies: standalone, sentinel, cluster.
 */
const _createSocketRedisClient = () => {
  const mode = (process.env.REDIS_MODE || "standalone").toLowerCase();

  const baseOptions = {
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 100, 1000);
    },
  };

  if (mode === "cluster") {
    const nodeStr = process.env.REDIS_CLUSTER_NODES || "localhost:6379";
    const startupNodes = nodeStr.split(",").map((s) => {
      const [host, port] = s.trim().split(":");
      return { host, port: parseInt(port || "6379", 10) };
    });
    return new Redis.Cluster(startupNodes, { redisOptions: baseOptions });
  }

  if (mode === "sentinel") {
    const sentinelHostStr = process.env.REDIS_SENTINEL_HOSTS || "localhost:26379";
    const sentinels = sentinelHostStr.split(",").map((s) => {
      const [host, port] = s.trim().split(":");
      return { host, port: parseInt(port || "26379", 10) };
    });
    return new Redis({
      sentinels,
      name: process.env.REDIS_SENTINEL_MASTER_NAME || "mymaster",
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
      role: "master",
      ...baseOptions,
    });
  }

  // Standalone
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    ...baseOptions,
  });
};

// ─── Socket.io Initialization ─────────────────────────────────────────────────

/**
 * Initializes the Socket.io server and attaches the Redis Adapter.
 *
 * Must be called once during application startup with the HTTP server instance.
 * In API-only deployments (PROCESS_TYPE=api), Socket.io runs on the API server.
 * In dedicated WS deployments, this would be called from a separate WS server process.
 *
 * @param {import("http").Server} server — HTTP server instance
 * @returns {import("socket.io").Server} io
 */
export const initializeSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000")
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
        if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS not allowed"), false);
      },
      credentials: true,
    },
    // Recommended transports: polling first for compatibility, then upgrade to WS
    transports: ["polling", "websocket"],
    // Ping/pong tuning for production WebSocket keepalive
    pingTimeout: 20_000,
    pingInterval: 25_000,
    // Connection state recovery — allows clients to reconnect and receive missed events
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // ── Attach Redis Adapter (multi-server broadcast) ──────────────────────────
  // Skip adapter in test environment or when Redis is explicitly disabled
  const skipAdapter =
    (process.env.NODE_ENV === "test" && !process.env.USE_REDIS_IN_TESTS) ||
    process.env.ENABLE_REDIS === "false";

  if (!skipAdapter) {
    try {
      pubClient = _createSocketRedisClient();
      subClient = _createSocketRedisClient();

      pubClient.on("error", (err) =>
        logger.warn({ err: err.message }, "[Socket.io] pubClient Redis error")
      );
      subClient.on("error", (err) =>
        logger.warn({ err: err.message }, "[Socket.io] subClient Redis error")
      );

      // Connect both before attaching adapter
      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info("[Socket.io] Redis Adapter attached — multi-server broadcasting enabled");
    } catch (err) {
      logger.error(
        { err: err.message },
        "[Socket.io] Failed to attach Redis Adapter — falling back to in-memory adapter (single-server only)"
      );
      try {
        if (pubClient) { pubClient.disconnect(false); pubClient = null; }
      } catch {}
      try {
        if (subClient) { subClient.disconnect(false); subClient = null; }
      } catch {}
      // Fall through: io still works but only on this server instance.
      // This is acceptable during a staged Redis Cluster migration.
    }
  } else {
    logger.debug("[Socket.io] Redis Adapter skipped (Redis disabled or test environment)");
  }

  // ── JWT Authentication Middleware ──────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded.id || decoded._id;
      next();
    } catch (err) {
      logger.warn({ err: err.message }, "[Socket.io] Auth token failed verification — proceeding as guest");
      next();
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Auto-join the authenticated user's private room
    if (userId) {
      socket.join(userId.toString());
      logger.debug({ userId, socketId: socket.id }, "[Socket.io] Client connected and joined room");
    }

    // Prevent joining other users' rooms — strict room isolation
    socket.on("join", (requestedUserId) => {
      if (requestedUserId && requestedUserId === userId) {
        socket.join(requestedUserId.toString());
      }
    });

    socket.on("disconnect", (reason) => {
      logger.debug({ userId, socketId: socket.id, reason }, "[Socket.io] Client disconnected");
    });

    socket.on("error", (err) => {
      logger.warn({ userId, socketId: socket.id, err: err.message }, "[Socket.io] Socket error");
    });
  });

  logger.info("[Socket.io] Server initialized");
  return io;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the initialized Socket.io server instance.
 * Throws if called before initializeSocket().
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized — call initializeSocket() first");
  }
  return io;
};

/**
 * Emits an event to a specific user's private room.
 *
 * With the Redis Adapter, this emission is forwarded across ALL Socket.io server
 * instances via Redis Pub/Sub, reaching the user regardless of which server
 * holds their WebSocket connection. This is the core of I5 correctness.
 *
 * @param {string} userId — MongoDB ObjectId string
 * @param {string} event  — Socket.io event name
 * @param {*} data        — Payload (must be JSON-serializable)
 */
export const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(userId.toString()).emit(event, data);
  }
};

/**
 * Emits an event to ALL connected clients across all server instances.
 */
export const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Emits an event to all sockets in a named room across all server instances.
 * Useful for salon-owner dashboards (room = salonId) or staff rooms.
 */
export const emitToRoom = (room, event, data) => {
  if (io && room) {
    io.to(room.toString()).emit(event, data);
  }
};

/**
 * Graceful shutdown: closes the Socket.io server and Redis pub/sub connections.
 * Call this during graceful process shutdown before closing MongoDB.
 */
export const shutdownSocketServer = async () => {
  if (io) {
    await new Promise((resolve) => io.close(resolve));
    logger.info("[Socket.io] Server closed");
    io = null;
  }

  const quits = [];
  if (pubClient) quits.push(pubClient.quit().catch(() => {}));
  if (subClient) quits.push(subClient.quit().catch(() => {}));
  await Promise.allSettled(quits);

  pubClient = null;
  subClient = null;
  logger.info("[Socket.io] Redis pub/sub clients closed");
};
