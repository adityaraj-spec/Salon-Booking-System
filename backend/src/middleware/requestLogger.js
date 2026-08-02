/**
 * requestLogger.js — HTTP request/response structured logging middleware.
 *
 * Reads context from AsyncLocalStorage (seeded by correlationIdMiddleware)
 * so every log line automatically carries requestId and correlationId.
 *
 * Log schema per request:
 *   - type:       "request" | "response"
 *   - method:     GET | POST | ...
 *   - url:        full URL path + query
 *   - statusCode: HTTP response code (on finish)
 *   - durationMs: elapsed time in milliseconds (on finish)
 *   - ip:         client IP (respects X-Forwarded-For via trust proxy)
 *   - userAgent:  client user-agent string
 *
 * Mount order: AFTER correlationIdMiddleware, BEFORE route handlers.
 */

import logger from "../lib/logger.js";

export const requestLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log inbound request at debug level (keeps info stream clean under high volume)
  logger.debug({
    type: "request",
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  }, `→ ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    // Use error level for 5xx, warn for 4xx, info for everything else
    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "info";

    logger[level]({
      type: "response",
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    }, `← ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`);
  });

  next();
};
