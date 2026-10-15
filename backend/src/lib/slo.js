/**
 * slo.js — Service Level Objectives (SLOs) & Error Budget Definitions for SalonNow Platform.
 */

export const SLO_DEFINITIONS = {
  availability: {
    name: "API Availability",
    target: 0.999, // 99.9% uptime
    windowDays: 30,
    allowedDowntimeMinutesPerMonth: 43.2,
    description: "99.9% of HTTP requests return 2xx or 4xx (non-server errors)",
  },
  latencyP99: {
    name: "API Latency p99",
    targetMs: 500, // p99 < 500ms
    description: "99% of API requests complete within 500ms",
  },
  latencyP95: {
    name: "API Latency p95",
    targetMs: 300, // p95 < 300ms
    description: "95% of API requests complete within 300ms",
  },
  bookingCorrectness: {
    name: "Booking Hold Safety",
    target: 0.9999, // 99.99% correctness
    description: "Zero double-bookings; 99.99% of hold requests return expected result",
  },
  paymentSafety: {
    name: "Payment Idempotency & Reconciliation",
    target: 1.0, // 100% safety
    description: "100% of captured payments are correctly recorded and reconciled (RPO = 0)",
  },
  eventDelivery: {
    name: "Outbox Event Delivery Latency",
    targetMs: 60000, // 60s
    target: 0.999, // 99.9%
    description: "99.9% of outbox events dispatched within 60 seconds",
  },
};

/**
 * Calculates remaining error budget given current metric values.
 *
 * @param {number} totalRequests - Total HTTP requests served in window
 * @param {number} errorCount - Total 5xx server errors in window
 * @param {number} targetSLO - Target ratio (e.g. 0.999)
 * @returns {{ consumedRatio: number, remainingRatio: number, isExhausted: boolean }}
 */
export const calculateErrorBudget = (totalRequests, errorCount, targetSLO = 0.999) => {
  if (totalRequests <= 0) {
    return { consumedRatio: 0, remainingRatio: 1.0, isExhausted: false };
  }

  const allowedErrors = totalRequests * (1 - targetSLO);
  const consumedRatio = errorCount / Math.max(1, allowedErrors);
  const remainingRatio = Math.max(0, 1 - consumedRatio);
  const isExhausted = errorCount > allowedErrors;

  return {
    consumedRatio: parseFloat(consumedRatio.toFixed(4)),
    remainingRatio: parseFloat(remainingRatio.toFixed(4)),
    isExhausted,
  };
};
