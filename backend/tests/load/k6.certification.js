import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 1000 },  // Ramp up to 1000 RPS over 1 min
    { duration: "10m", target: 1000 }, // Sustained load at 1000 RPS for 10 mins
    { duration: "30s", target: 5000 }, // Spike load test at 5000 RPS for 30s
    { duration: "30s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ["rate<0.001"],   // Error rate < 0.1%
    http_req_duration: ["p(95)<300", "p(99)<500"], // p95 < 300ms, p99 < 500ms
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:8000";

export default function () {
  // 1. Health Probe Check
  const healthRes = http.get(`${BASE_URL}/health/ready`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
  });

  // 2. Salon Search Query Simulation
  const searchRes = http.get(`${BASE_URL}/api/v1/salons/search?city=Delhi&limit=10`);
  check(searchRes, {
    "search status is 200": (r) => r.status === 200,
    "search latency < 300ms": (r) => r.timings.duration < 300,
  });

  sleep(0.1);
}
