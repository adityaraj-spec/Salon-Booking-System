/**
 * correlationId.js — Correlation ID & AsyncLocalStorage context seeding middleware.
 *
 * # Responsibilities
 *
 *   1. Extract or generate a unique `requestId` for this HTTP request.
 *   2. Extract or derive a `correlationId` linking related requests
 *      (e.g., client → API → webhook → worker).
 *   3. Seed the AsyncLocalStorage store so every logger.* call anywhere
 *      in the async chain automatically includes these identifiers.
 *   4. Set X-Request-Id and X-Correlation-Id response headers so callers
 *      can correlate their own traces.
 *
 * # Context Store Schema
 *
 *   {
 *     requestId:     string,   // UUID, unique per HTTP request
 *     correlationId: string,   // UUID, shared across related requests
 *     userId:        string|null,
 *     salonId:       string|null,
 *     bookingId:     string|null,
 *     paymentId:     string|null,
 *   }
 *
 * # Propagation
 *
 *   HTTP clients should forward X-Correlation-Id to maintain a trace chain.
 *   Workers receive correlationId through job.data.correlationId.
 *
 * # Mount Order
 *
 *   MUST be mounted BEFORE requestLoggerMiddleware and BEFORE auth middleware,
 *   so that auth can add userId to the store after it resolves the JWT.
 */

import crypto from "crypto";
import { asyncLocalStorage } from "../lib/logger.js";

export const correlationIdMiddleware = (req, res, next) => {
  // Honour upstream request IDs (from NGINX, API Gateway, or frontend)
  const requestId     = req.headers["x-request-id"]     || crypto.randomUUID();
  const correlationId = req.headers["x-correlation-id"] || requestId;

  // Expose IDs on the request object for legacy middleware compatibility
  req.id            = requestId;
  req.correlationId = correlationId;

  // Set response headers so clients can track their request
  res.setHeader("X-Request-Id",     requestId);
  res.setHeader("X-Correlation-Id", correlationId);

  // Seed the async context store — all downstream code in this request's
  // async chain will see this store via asyncLocalStorage.getStore()
  const contextStore = {
    requestId,
    correlationId,
    // userId/salonId/bookingId/paymentId start null;
    // enrichLogContext() populates them as the request flows through services
    userId:    null,
    salonId:   null,
    bookingId: null,
    paymentId: null,
  };

  asyncLocalStorage.run(contextStore, () => {
    next();
  });
};
