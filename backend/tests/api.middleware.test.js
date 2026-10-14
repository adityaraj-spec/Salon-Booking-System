process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

describe("Automated API Testing: Middleware, Health & Edge Cases Suite", () => {
  describe("Health & Readiness Probes", () => {
    it("should return 200 OK for GET /health with system liveness metrics", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");
      expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.data.memoryUsageMB).toBeGreaterThan(0);
    });

    it("should return 200 OK for GET /health/ready verifying database connection", async () => {
      const res = await request(app).get("/health/ready");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ready");
      expect(res.body.data.dependencies.mongo).toBe("connected");
    });
  });

  describe("Request Tracing & Security Headers", () => {
    it("should automatically generate an X-Request-Id header when omitted", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-request-id"]).toBeDefined();
      expect(typeof res.headers["x-request-id"]).toBe("string");
      expect(res.headers["x-request-id"].length).toBeGreaterThan(0);
    });

    it("should preserve and propagate caller-supplied X-Request-Id header", async () => {
      const customId = "trace-test-uuid-987654321";
      const res = await request(app)
        .get("/health")
        .set("X-Request-Id", customId);

      expect(res.headers["x-request-id"]).toBe(customId);
    });
  });

  describe("Global 404 Route Handler", () => {
    it("should return structured 404 error for undefined API routes", async () => {
      const res = await request(app).get("/api/v1/non-existent-endpoint-xyz");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});
