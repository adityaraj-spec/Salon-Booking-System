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

export const getPrometheusMetrics = async () => {
  return await client.register.metrics();
};

export const getContentType = () => client.register.contentType;
