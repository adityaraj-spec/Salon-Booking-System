import client from "prom-client";

// Collect default Node.js runtime & process metrics
client.collectDefaultMetrics({ prefix: "salonnow_" });

export const httpRequestDurationSeconds = new client.Histogram({
  name: "salonnow_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestsTotal = new client.Counter({
  name: "salonnow_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "code"],
});

export const activeHoldsGauge = new client.Gauge({
  name: "salonnow_active_holds_total",
  help: "Current number of active non-expired booking holds",
});

export const completedBookingsCounter = new client.Counter({
  name: "salonnow_completed_bookings_total",
  help: "Total number of successfully completed bookings",
});

// ─── Razorpay Circuit Breaker Metrics (Milestone 2) ──────────────────────────

/**
 * Counts each circuit state transition (open / half_open / close) per breaker.
 * Labels:
 *   breaker  — e.g. "razorpay-create-order", "razorpay-fetch-payment", "razorpay-refund-payment"
 *   state    — "open" | "half_open" | "close"
 */
export const razorpayBreakerStateTransitionsTotal = new client.Counter({
  name: "salonnow_razorpay_breaker_state_transitions_total",
  help: "Total number of Razorpay circuit breaker state transitions",
  labelNames: ["breaker", "state"],
});

/**
 * Counts each call rejected by an open breaker (fast-fail, no network hit).
 * Labels:
 *   breaker  — which breaker rejected the call
 */
export const razorpayBreakerRejectionsTotal = new client.Counter({
  name: "salonnow_razorpay_breaker_rejections_total",
  help: "Total number of Razorpay calls rejected by open circuit breaker",
  labelNames: ["breaker"],
});

/**
 * Counts each Razorpay call that timed out.
 * Labels:
 *   operation — e.g. "orders.create", "payments.fetch", "payments.refund"
 */
export const razorpayTimeoutsTotal = new client.Counter({
  name: "salonnow_razorpay_timeouts_total",
  help: "Total number of Razorpay API calls that timed out",
  labelNames: ["operation"],
});

/**
 * Counts payment recovery worker retries.
 * Labels:
 *   reason — "timeout" | "breaker_open" | "other"
 */
export const paymentRecoveryRetriesTotal = new client.Counter({
  name: "salonnow_payment_recovery_retries_total",
  help: "Total number of payment recovery worker job retries",
  labelNames: ["reason"],
});

/**
 * Counts payment recovery jobs that failed permanently (all attempts exhausted).
 */
export const paymentRecoveryPermanentFailuresTotal = new client.Counter({
  name: "salonnow_payment_recovery_permanent_failures_total",
  help: "Total number of payment recovery jobs that failed after all retry attempts",
  labelNames: [],
});

/**
 * Gauge showing the current state of each circuit breaker.
 * Values: 0 = closed, 1 = open, 2 = half_open
 * Labels:
 *   breaker — breaker name
 */
export const razorpayBreakerStateGauge = new client.Gauge({
  name: "salonnow_razorpay_breaker_state",
  help: "Current circuit breaker state: 0=closed, 1=open, 2=half_open",
  labelNames: ["breaker"],
});

export const getPrometheusMetrics = async () => {
  return await client.register.metrics();
};

export const getContentType = () => client.register.contentType;
