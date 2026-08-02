/**
 * razorpayBreaker.js — Circuit-breaker-protected Razorpay API call wrappers.
 *
 * # Problem Being Solved
 *
 *   Every Razorpay SDK call (orders.create, payments.fetch, payments.refund)
 *   is an outbound HTTP request with no default timeout. If the Razorpay API
 *   becomes slow or unresponsive, those calls block the Node.js event loop
 *   indefinitely. Under high concurrency, this exhausts the async I/O pool,
 *   causes memory pressure, and crashes the process.
 *
 * # Solution Architecture
 *
 *   Three layered defences:
 *
 *   1. TIMEOUT  — Every underlying async call is raced against a hard deadline
 *                 (RAZORPAY_TIMEOUT_MS, default 8000ms). Whichever resolves first
 *                 wins; if the timeout fires first, the call is rejected with
 *                 RazorpayTimeoutError so the caller can fail fast.
 *
 *   2. CIRCUIT BREAKER (Opossum) — Wraps the timeout-guarded call.
 *                 If ≥ 50% of calls within the rolling window fail (timeout counts
 *                 as failure), the breaker OPENS and immediately rejects all
 *                 subsequent calls without touching the network. This prevents
 *                 thundering-herd requests from multiplying load on a degraded gateway.
 *                 After BREAKER_RESET_TIMEOUT_MS the breaker enters HALF-OPEN and
 *                 sends a single probe request; if it succeeds the breaker CLOSES.
 *
 *   3. METRICS / LOGGING — Every state transition (open, half-open, close) and
 *                 every timeout is logged at the appropriate severity. The breaker
 *                 state is exposed via getCircuitBreakerStats() for the /health/ready
 *                 endpoint and Prometheus metrics.
 *
 * # Idempotency Guarantee
 *
 *   These wrappers do NOT change the underlying idempotency guarantees in payment.service.js.
 *   confirmPaymentAndBooking() still uses payment.status === "captured" as the
 *   single authoritative guard. The circuit breaker only affects the network call,
 *   never the DB state machine.
 *
 * # Exported API
 *
 *   razorpayCreateOrder(params)              — orders.create with timeout + breaker
 *   razorpayFetchPayment(paymentId)          — payments.fetch with timeout + breaker
 *   razorpayRefundPayment(paymentId, params) — payments.refund with timeout + breaker
 *   getCircuitBreakerStats()                 — current breaker states for /health endpoint
 */

import CircuitBreaker from "opossum";
import { razorpayClient } from "./razorpay.js";
import logger from "../lib/logger.js";

// ─── Configuration ────────────────────────────────────────────────────────────
const RAZORPAY_TIMEOUT_MS    = parseInt(process.env.RAZORPAY_TIMEOUT_MS    || "8000",  10);
const BREAKER_RESET_TIMEOUT_MS = parseInt(process.env.BREAKER_RESET_TIMEOUT_MS || "30000", 10);
const BREAKER_ERROR_THRESHOLD  = parseInt(process.env.BREAKER_ERROR_THRESHOLD  || "50",    10); // % failures to open
const BREAKER_VOLUME_THRESHOLD = parseInt(process.env.BREAKER_VOLUME_THRESHOLD || "5",     10); // min requests before stats matter

// ─── Timeout Helper ───────────────────────────────────────────────────────────
/**
 * Races an async function against a deadline.
 * The original promise is not cancelled (Node.js limitation) but the caller
 * receives the rejection immediately — preventing the event loop from waiting.
 *
 * @param {() => Promise<any>} fn
 * @param {number} timeoutMs
 * @param {string} operationName  — used in error messages and log fields
 * @returns {Promise<any>}
 */
const withTimeout = (fn, timeoutMs, operationName) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`[Razorpay] ${operationName} timed out after ${timeoutMs}ms`);
      err.name = "RazorpayTimeoutError";
      err.operationName = operationName;
      err.timeoutMs = timeoutMs;
      reject(err);
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// ─── Circuit Breaker Factory ──────────────────────────────────────────────────
/**
 * Creates an Opossum circuit breaker for a named Razorpay operation.
 * All breakers share the same configuration profile but are independent
 * state machines — a payment.fetch outage does not affect orders.create.
 *
 * @param {(args: any) => Promise<any>} fn       — the timeout-protected async function
 * @param {string}                      name     — human-readable breaker name for logs
 * @returns {CircuitBreaker}
 */
const createBreaker = (fn, name) => {
  const breaker = new CircuitBreaker(fn, {
    name,
    // Opossum's own timeout is set to false — we manage timeout explicitly via withTimeout()
    // so we get consistent error types across all failure modes.
    timeout: false,
    errorThresholdPercentage: BREAKER_ERROR_THRESHOLD,
    volumeThreshold: BREAKER_VOLUME_THRESHOLD,
    resetTimeout: BREAKER_RESET_TIMEOUT_MS,
  });

  breaker.on("open", () => {
    logger.error(
      { breaker: name, resetInMs: BREAKER_RESET_TIMEOUT_MS },
      "[RazorpayBreaker] Circuit OPEN — fast-failing all calls until reset"
    );
  });

  breaker.on("halfOpen", () => {
    logger.warn(
      { breaker: name },
      "[RazorpayBreaker] Circuit HALF-OPEN — sending probe request"
    );
  });

  breaker.on("close", () => {
    logger.info(
      { breaker: name },
      "[RazorpayBreaker] Circuit CLOSED — normal operation restored"
    );
  });

  breaker.on("fallback", (result, err) => {
    logger.warn(
      { breaker: name, err: err?.message },
      "[RazorpayBreaker] Fallback triggered"
    );
  });

  breaker.on("timeout", () => {
    logger.warn(
      { breaker: name },
      "[RazorpayBreaker] Opossum timeout (should not occur — we use withTimeout)"
    );
  });

  breaker.on("reject", () => {
    logger.warn(
      { breaker: name },
      "[RazorpayBreaker] Call rejected — circuit is OPEN"
    );
  });

  return breaker;
};

// ─── Create Order Breaker ─────────────────────────────────────────────────────
const _createOrderFn = (params) =>
  withTimeout(
    () => razorpayClient.orders.create(params),
    RAZORPAY_TIMEOUT_MS,
    "orders.create"
  );

const createOrderBreaker = createBreaker(_createOrderFn, "razorpay-create-order");

// ─── Fetch Payment Breaker ────────────────────────────────────────────────────
const _fetchPaymentFn = (paymentId) =>
  withTimeout(
    () => razorpayClient.payments.fetch(paymentId),
    RAZORPAY_TIMEOUT_MS,
    "payments.fetch"
  );

const fetchPaymentBreaker = createBreaker(_fetchPaymentFn, "razorpay-fetch-payment");

// ─── Refund Payment Breaker ───────────────────────────────────────────────────
const _refundPaymentFn = ({ paymentId, params }) =>
  withTimeout(
    () => razorpayClient.payments.refund(paymentId, params),
    RAZORPAY_TIMEOUT_MS,
    "payments.refund"
  );

const refundPaymentBreaker = createBreaker(_refundPaymentFn, "razorpay-refund-payment");

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order with timeout + circuit breaker protection.
 * @param {object} params — razorpay orders.create params
 * @returns {Promise<object>} — razorpay order object
 * @throws {Error} — RazorpayTimeoutError, or circuit breaker OpenCircuitError
 */
export const razorpayCreateOrder = async (params) => {
  const start = Date.now();
  try {
    const result = await createOrderBreaker.fire(params);
    logger.debug(
      { durationMs: Date.now() - start },
      "[RazorpayBreaker] orders.create succeeded"
    );
    return result;
  } catch (err) {
    logger.error(
      { err: err.message, errName: err.name, durationMs: Date.now() - start },
      "[RazorpayBreaker] orders.create failed"
    );
    throw err;
  }
};

/**
 * Fetches a Razorpay payment by ID with timeout + circuit breaker protection.
 * @param {string} paymentId — razorpay payment ID (e.g. pay_xxx)
 * @returns {Promise<object>} — razorpay payment entity
 */
export const razorpayFetchPayment = async (paymentId) => {
  const start = Date.now();
  try {
    const result = await fetchPaymentBreaker.fire(paymentId);
    logger.debug(
      { paymentId, durationMs: Date.now() - start },
      "[RazorpayBreaker] payments.fetch succeeded"
    );
    return result;
  } catch (err) {
    logger.error(
      { paymentId, err: err.message, errName: err.name, durationMs: Date.now() - start },
      "[RazorpayBreaker] payments.fetch failed"
    );
    throw err;
  }
};

/**
 * Initiates a Razorpay refund with timeout + circuit breaker protection.
 * @param {string} paymentId  — razorpay payment ID to refund
 * @param {object} params     — refund params (amount, notes, etc.)
 * @returns {Promise<object>} — razorpay refund entity
 */
export const razorpayRefundPayment = async (paymentId, params) => {
  const start = Date.now();
  try {
    const result = await refundPaymentBreaker.fire({ paymentId, params });
    logger.debug(
      { paymentId, durationMs: Date.now() - start },
      "[RazorpayBreaker] payments.refund succeeded"
    );
    return result;
  } catch (err) {
    logger.error(
      { paymentId, err: err.message, errName: err.name, durationMs: Date.now() - start },
      "[RazorpayBreaker] payments.refund failed"
    );
    throw err;
  }
};

/**
 * Returns the current circuit breaker states for health checks and monitoring.
 * @returns {{ [name: string]: { state: string, stats: object } }}
 */
export const getCircuitBreakerStats = () => ({
  createOrder: {
    state:  createOrderBreaker.opened   ? "open"
          : createOrderBreaker.halfOpen ? "half_open"
          : "closed",
    stats: createOrderBreaker.stats,
  },
  fetchPayment: {
    state:  fetchPaymentBreaker.opened   ? "open"
          : fetchPaymentBreaker.halfOpen  ? "half_open"
          : "closed",
    stats: fetchPaymentBreaker.stats,
  },
  refundPayment: {
    state:  refundPaymentBreaker.opened   ? "open"
          : refundPaymentBreaker.halfOpen  ? "half_open"
          : "closed",
    stats: refundPaymentBreaker.stats,
  },
});
