import logger from "../lib/logger.js";

/**
 * Gap X.4 — Request/Response Logger Middleware
 * Logs every HTTP request with method, path, requestId, userId on start,
 * and statusCode + durationMs on completion.
 */
export const requestLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log inbound request
  logger.info({
    type: "request",
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?._id || null,
    ip: req.ip,
  }, `→ ${req.method} ${req.path}`);

  // Intercept response finish to log outcome
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level]({
      type: "response",
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?._id || null,
    }, `← ${req.method} ${req.path} ${res.statusCode} (${durationMs}ms)`);
  });

  next();
};
