import { httpRequestDurationSeconds, httpRequestsTotal } from "../lib/metrics.js";

/**
 * Middleware to track HTTP request rates and execution duration for Prometheus.
 */
export const prometheusMetricsMiddleware = (req, res, next) => {
  if (req.path === "/metrics" || req.path === "/health" || req.path === "/health/ready") {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      code: res.statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        code: res.statusCode,
      },
      durationInSeconds
    );
  });

  next();
};
