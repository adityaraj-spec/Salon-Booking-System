import supertest from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

describe("Phase 9 Observability & DevOps Infrastructure Test Suite", () => {
  it("should return Prometheus metrics from GET /metrics endpoint", async () => {
    const res = await supertest(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("salonnow_");
    expect(res.text).toContain("salonnow_http_requests_total");
    expect(res.text).toContain("salonnow_http_request_duration_seconds");
  });

  it("should return healthy status from /health probe", async () => {
    const res = await supertest(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.version).toBe("1.0.0");
  });

  it("should return readiness status from /health/ready probe when connected", async () => {
    const res = await supertest(app).get("/health/ready");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ready");
    expect(res.body.data.dependencies.mongo).toBe("connected");
  });
});
