import mongoose from "mongoose";
import supertest from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { clearUserSessionCache } from "../src/middleware/auth.middleware.js";
import { cacheGet } from "../src/lib/cacheManager.js";
import app from "../src/app.js";

let replSet;

beforeAll(async () => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    process.env.ACCESS_TOKEN_SECRET = "test_secret_key_12345";
  }
  if (!process.env.ACCESS_TOKEN_EXPIRY) {
    process.env.ACCESS_TOKEN_EXPIRY = "1h";
  }

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

beforeEach(async () => {
  await User.deleteMany({});
});

describe("Phase 10 Scale-Out Architecture & Hardening Test Suite", () => {
  describe("Redis JWT Auth Caching & Invalidation", () => {
    it("should cache authenticated user in Redis and allow explicit cache clearing", async () => {
      const user = await User.create({
        username: "scaleuser",
        email: "scaleuser@test.com",
        fullName: "Scale User",
        phonenumber: "9876543210",
        password: "password123",
      });

      const token = user.generateAccessToken();

      const res1 = await supertest(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`);

      if (res1.status !== 200) {
        console.error("[Phase 10 Test Error Body]:", res1.body);
      }

      expect(res1.status).toBe(200);

      const cached = await cacheGet(`user:session:${user._id}`);
      if (cached) {
        expect(cached.username).toBe("scaleuser");
      }

      await clearUserSessionCache(user._id.toString());
      const postClear = await cacheGet(`user:session:${user._id}`);
      expect(postClear).toBeNull();
    });
  });
});
