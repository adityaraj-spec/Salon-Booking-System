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

// ─── Rate Limiter Metrics (Milestone 3) ──────────────────────────────────────

/**
 * Counts booking hold creation requests by outcome status.
 * Labels:
 *   status — "allowed" | "blocked" | "error"
 */
export const holdRequestsTotal = new client.Counter({
  name: "salonnow_hold_requests_total",
  help: "Total number of booking hold requests by status",
  labelNames: ["status"],
});

/**
 * Counts rate limiter rejections by dimension and reason.
 * Labels:
 *   prefix — e.g. "hold_create", "auth_strict", "general_api"
 *   type   — "user" | "ip" | "salon" | "burst"
 *   reason — "exceeded"
 */
export const rateLimitRejectionsTotal = new client.Counter({
  name: "salonnow_rate_limit_rejections_total",
  help: "Total number of rate-limit rejections by dimension",
  labelNames: ["prefix", "type", "reason"],
});

/**
 * Measures latency of Redis rate-limiter pipeline execution in seconds.
 * Labels:
 *   prefix — e.g. "hold_create", "auth_strict", "general_api"
 */
export const rateLimiterLatencySeconds = new client.Histogram({
  name: "salonnow_rate_limiter_latency_seconds",
  help: "Latency of rate limiter checks in seconds",
  labelNames: ["prefix"],
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

/**
 * Counts Redis connection or execution errors encountered during rate-limit checks.
 * Labels:
 *   prefix — rate limiter prefix
 *   mode   — "fail_closed" | "fail_open"
 */
export const rateLimiterErrorsTotal = new client.Counter({
  name: "salonnow_rate_limiter_errors_total",
  help: "Total number of Redis rate limiter execution errors",
  labelNames: ["prefix", "mode"],
});

// ─── Outbox Relay Metrics (Milestone 4) ──────────────────────────────────────

/**
 * Counts total outbox events processed by final status.
 * Labels:
 *   status — "processed" | "failed" | "dead_letter"
 */
export const outboxThroughputTotal = new client.Counter({
  name: "salonnow_outbox_throughput_total",
  help: "Total number of outbox events processed by status",
  labelNames: ["status"],
});

/**
 * Measures processing latency of outbox event dispatch in seconds.
 */
export const outboxProcessingLatencySeconds = new client.Histogram({
  name: "salonnow_outbox_processing_latency_seconds",
  help: "Processing latency of outbox event dispatch in seconds",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

/**
 * Gauge tracking current pending/processing outbox queue backlog.
 */
export const outboxQueueBacklog = new client.Gauge({
  name: "salonnow_outbox_queue_backlog",
  help: "Current count of unprocessed outbox events in backlog",
});

/**
 * Counts outbox event retries scheduled with exponential backoff.
 */
export const outboxRetriesTotal = new client.Counter({
  name: "salonnow_outbox_retries_total",
  help: "Total number of outbox event retries scheduled",
});

/**
 * Counts poison events transitioned to dead-letter queue.
 */
export const outboxDeadLetterTotal = new client.Counter({
  name: "salonnow_outbox_dead_letter_total",
  help: "Total number of poison outbox events moved to dead-letter status",
});

/**
 * Counts worker lease recoveries (claiming expired leases after worker crash).
 */
export const outboxLeaseRecoveriesTotal = new client.Counter({
  name: "salonnow_outbox_lease_recoveries_total",
  help: "Total number of expired worker leases recovered by active workers",
});

// ─── Health & Graceful Shutdown Metrics (Milestone 5) ─────────────────────────

/**
 * Measures duration of process graceful shutdown in seconds.
 */
export const shutdownDurationSeconds = new client.Histogram({
  name: "salonnow_shutdown_duration_seconds",
  help: "Duration of graceful process shutdown in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

/**
 * Counts readiness probe state transitions.
 * Labels:
 *   state — "ready" | "not_ready"
 */
export const readinessTransitionsTotal = new client.Counter({
  name: "salonnow_readiness_transitions_total",
  help: "Total number of readiness state transitions",
  labelNames: ["state"],
});

/**
 * Gauge tracking in-flight active HTTP requests.
 */
export const activeHttpRequestsGauge = new client.Gauge({
  name: "salonnow_active_http_requests_total",
  help: "Current number of in-flight active HTTP requests being processed",
});

/**
 * Gauge tracking in-flight active worker jobs by worker type.
 * Labels:
 *   worker — e.g. "payment_recovery", "hold_expiry", "outbox_relay"
 */
export const activeWorkerJobsGauge = new client.Gauge({
  name: "salonnow_active_worker_jobs_total",
  help: "Current number of in-flight worker jobs being processed",
  labelNames: ["worker"],
});

/**
 * Counts process graceful shutdown outcomes.
 * Labels:
 *   status — "success" | "timeout" | "error"
 */
export const gracefulShutdownTotal = new client.Counter({
  name: "salonnow_graceful_shutdown_total",
  help: "Total number of graceful shutdown executions by final status",
  labelNames: ["status"],
});



