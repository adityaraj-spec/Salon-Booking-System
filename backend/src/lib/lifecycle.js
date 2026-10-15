import logger from "./logger.js";
import {
  activeHttpRequestsGauge,
  activeWorkerJobsGauge,
  readinessTransitionsTotal,
} from "./metrics.js";

let isAppStarted = false;
let isAppReady = false;
let isShuttingDown = false;

let activeHttpRequestsCount = 0;
const activeWorkerJobsMap = new Map();

/**
 * Returns current application lifecycle state flags.
 */
export const getLifecycleState = () => ({
  isAppStarted,
  isAppReady,
  isShuttingDown,
  activeHttpRequests: activeHttpRequestsCount,
  activeWorkerJobs: Object.fromEntries(activeWorkerJobsMap),
});

/**
 * Updates application initialization state flag.
 * @param {boolean} status
 */
export const setAppStarted = (status) => {
  isAppStarted = Boolean(status);
  logger.info({ isAppStarted }, "[Lifecycle] Application startup state updated");
};

/**
 * Updates application readiness probe state flag.
 * @param {boolean} status
 */
export const setAppReady = (status) => {
  const previous = isAppReady;
  isAppReady = Boolean(status);

  if (previous !== isAppReady) {
    try {
      readinessTransitionsTotal.inc({ state: isAppReady ? "ready" : "not_ready" });
    } catch {}
    logger.info({ isAppReady, previousState: previous }, "[Lifecycle] Readiness state transition");
  }
};

/**
 * Marks server as shutting down (immediately causes /health/ready to return 503).
 * @param {boolean} status
 */
export const setShuttingDown = (status) => {
  isShuttingDown = Boolean(status);
  if (isShuttingDown) {
    setAppReady(false);
    logger.warn({ isShuttingDown: true }, "[Lifecycle] Marked server as shutting down — readiness set to false");
  }
};

/**
 * Increments active HTTP request counter.
 */
export const incrementActiveHttpRequests = () => {
  activeHttpRequestsCount++;
  try { activeHttpRequestsGauge.set(activeHttpRequestsCount); } catch {}
};

/**
 * Decrements active HTTP request counter.
 */
export const decrementActiveHttpRequests = () => {
  activeHttpRequestsCount = Math.max(0, activeHttpRequestsCount - 1);
  try { activeHttpRequestsGauge.set(activeHttpRequestsCount); } catch {}
};

/**
 * Increments active worker job counter for a specific worker type.
 * @param {string} workerName - e.g. "outbox_relay", "payment_recovery"
 */
export const incrementActiveWorkerJobs = (workerName = "generic") => {
  const current = activeWorkerJobsMap.get(workerName) || 0;
  const updated = current + 1;
  activeWorkerJobsMap.set(workerName, updated);
  try { activeWorkerJobsGauge.set({ worker: workerName }, updated); } catch {}
};

/**
 * Decrements active worker job counter for a specific worker type.
 * @param {string} workerName
 */
export const decrementActiveWorkerJobs = (workerName = "generic") => {
  const current = activeWorkerJobsMap.get(workerName) || 0;
  const updated = Math.max(0, current - 1);
  activeWorkerJobsMap.set(workerName, updated);
  try { activeWorkerJobsGauge.set({ worker: workerName }, updated); } catch {}
};

/**
 * Waits for active in-flight HTTP requests to drain to 0, up to maxTimeoutMs.
 * @param {number} maxTimeoutMs
 * @returns {Promise<boolean>} True if drained completely, false if timed out
 */
export const waitForHttpRequestsToDrain = async (maxTimeoutMs = 10000) => {
  const start = Date.now();
  logger.info({ activeRequests: activeHttpRequestsCount, maxTimeoutMs }, "[Lifecycle] Waiting for in-flight HTTP requests to drain...");

  while (activeHttpRequestsCount > 0 && Date.now() - start < maxTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const drained = activeHttpRequestsCount === 0;
  if (drained) {
    logger.info({ elapsedMs: Date.now() - start }, "[Lifecycle] All in-flight HTTP requests drained successfully");
  } else {
    logger.warn({ remainingRequests: activeHttpRequestsCount, elapsedMs: Date.now() - start }, "[Lifecycle] HTTP request drain timed out — proceeding with shutdown");
  }
  return drained;
};
