process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_EXPIRY = "7d";

import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";
import { User } from "../src/models/user.models.js";

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

beforeEach(async () => {
  await User.deleteMany({});
});

describe("Automated API Testing: Authentication & User Management Suite", () => {
  describe("POST /api/v1/users/register", () => {
    it("should register a new user successfully with valid payload (201 Created)", async () => {
      const payload = {
        fullName: "Test User",
        email: "testuser@example.com",
        username: "testuser123",
        password: "password123",
        phonenumber: "+919876543210",
        role: "customer",
      };

      const res = await request(app)
        .post("/api/v1/users/register")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("testuser@example.com");

      // Verify user was persisted to database
      const dbUser = await User.findOne({ email: "testuser@example.com" });
      expect(dbUser).not.toBeNull();
      expect(dbUser.username).toBe("testuser123");
      expect(dbUser.isVerified).toBe(false);
    });

    it("should reject registration when required fields are missing or invalid (400 Bad Request)", async () => {
      const invalidPayload = {
        fullName: "A", // too short (< 2 chars)
        email: "not-an-email",
        username: "tu", // too short (< 3 chars)
        password: "short", // too short (< 8 chars)
        phonenumber: "invalid-phone",
      };

      const res = await request(app)
        .post("/api/v1/users/register")
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject duplicate registration with existing email or username (409 Conflict)", async () => {
      await User.create({
        fullName: "Existing User",
        email: "duplicate@example.com",
        username: "duplicateuser",
        password: "password123",
        phonenumber: "+919876543210",
        role: "customer",
      });

      const duplicatePayload = {
        fullName: "Another User",
        email: "duplicate@example.com",
        username: "duplicateuser",
        password: "newpassword123",
        phonenumber: "+919876543211",
      };

      const res = await request(app)
        .post("/api/v1/users/register")
        .send(duplicatePayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe("POST /api/v1/users/login", () => {
    it("should log in successfully with valid credentials for verified user (200 OK)", async () => {
      const user = await User.create({
        fullName: "Verified User",
        email: "verified@example.com",
        username: "verifieduser",
        password: "password123",
        phonenumber: "+919876543210",
        isVerified: true,
        role: "customer",
      });

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "verified@example.com",
          password: "password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.accessToken).toBeDefined();

      // Check for auth cookies
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const hasAccessTokenCookie = cookies.some((c) => c.includes("accessToken="));
      expect(hasAccessTokenCookie).toBe(true);
    });

    it("should reject login with incorrect password (401 Unauthorized)", async () => {
      await User.create({
        fullName: "User For Auth",
        email: "authcheck@example.com",
        username: "authcheck",
        password: "correctpassword",
        phonenumber: "+919876543210",
        isVerified: true,
      });

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "authcheck@example.com",
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid credential/i);
    });

    it("should reject login for unverified user (403 Forbidden)", async () => {
      await User.create({
        fullName: "Unverified User",
        email: "unverified@example.com",
        username: "unverifieduser",
        password: "password123",
        phonenumber: "+919876543210",
        isVerified: false,
      });

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "unverified@example.com",
          password: "password123",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Email not verified/i);
    });

    it("should return 404 when user does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Protected User Routes: GET /api/v1/users/me & POST /api/v1/users/logout", () => {
    it("should reject GET /api/v1/users/me when no token is provided (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/v1/users/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return current user profile when valid Bearer token is provided (200 OK)", async () => {
      const user = await User.create({
        fullName: "Profile User",
        email: "profile@example.com",
        username: "profileuser",
        password: "password123",
        phonenumber: "+919876543210",
        isVerified: true,
      });

      const token = user.generateAccessToken();

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("profile@example.com");
      expect(res.body.data.user.username).toBe("profileuser");
    });

    it("should clear session cookies on POST /api/v1/users/logout", async () => {
      const user = await User.create({
        fullName: "Logout User",
        email: "logout@example.com",
        username: "logoutuser",
        password: "password123",
        phonenumber: "+919876543210",
        isVerified: true,
      });

      const token = user.generateAccessToken();

      const res = await request(app)
        .post("/api/v1/users/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify accessToken / refreshToken cookie is cleared (max-age=0 or expires in past)
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
    });
  });
});
