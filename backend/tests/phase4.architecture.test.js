import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";
import { formatPaginatedResponse } from "../src/utils/pagination.js";
import { NotFoundError, ValidationError, ConflictError } from "../src/errors/domainErrors.js";

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

describe("Phase 4 Backend Architecture Test Suite", () => {
  describe("Health Probes & Request ID Middleware", () => {
    it("should return 200 for GET /health with system liveness info and X-Request-Id header", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body.data.status).toBe("ok");
      expect(response.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(response.body.data.memoryUsageMB).toBeGreaterThan(0);
    });

    it("should return 200 for GET /health/ready with MongoDB connected state", async () => {
      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("ready");
      expect(response.body.data.dependencies.mongo).toBe("connected");
    });

    it("should propagate existing X-Request-Id if provided by caller", async () => {
      const customId = "test-custom-request-id-12345";
      const response = await request(app)
        .get("/health")
        .set("X-Request-Id", customId);

      expect(response.headers["x-request-id"]).toBe(customId);
    });
  });

  describe("Domain Error Classes", () => {
    it("should correctly instantiate domain errors with codes and status codes", () => {
      const notFound = new NotFoundError("Salon not found");
      expect(notFound.statusCode).toBe(404);
      expect(notFound.code).toBe("NOT_FOUND");

      const validation = new ValidationError("Invalid body", [{ field: "email", message: "Required" }]);
      expect(validation.statusCode).toBe(400);
      expect(validation.code).toBe("VALIDATION_ERROR");

      const conflict = new ConflictError("Slot full");
      expect(conflict.statusCode).toBe(409);
      expect(conflict.code).toBe("CONFLICT");
    });
  });

  describe("Pagination Helper Utility", () => {
    it("should correctly format paginated response metadata", () => {
      const items = [1, 2, 3, 4, 5];
      const result = formatPaginatedResponse({
        data: items,
        totalItems: 25,
        page: 2,
        limit: 5,
      });

      expect(result.data).toHaveLength(5);
      expect(result.pagination).toEqual({
        totalItems: 25,
        totalPages: 5,
        currentPage: 2,
        limit: 5,
        hasNext: true,
        hasPrev: true,
      });
    });
  });
});
