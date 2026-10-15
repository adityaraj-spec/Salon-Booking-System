process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.ACCESS_TOKEN_EXPIRY = "1h";

import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";
import { Salon } from "../src/models/salon.models.js";
import { User } from "../src/models/user.models.js";
import { clearL1Cache } from "../src/lib/cacheManager.js";

let replSet;
let testOwner;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  testOwner = await User.create({
    fullName: "Salon Owner",
    email: "owner@salontest.com",
    username: "salonowner1",
    password: "password123",
    phonenumber: "+919876543210",
    isVerified: true,
    role: "salonOwner",
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  clearL1Cache();
  await Salon.deleteMany({});
});

describe("Automated API Testing: Salons & Services Suite", () => {
  describe("GET /api/v1/salons", () => {
    it("should return empty list with pagination when no salons exist (200 OK)", async () => {
      const res = await request(app).get("/api/v1/salons");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.salons)).toBe(true);
      expect(res.body.data.salons).toHaveLength(0);
      expect(res.body.data.pagination).toBeDefined();
    });

    it("should return populated salons with correct pagination metadata", async () => {
      await Salon.create([
        {
          owner: testOwner._id,
          name: "Glamour Haven",
          city: "Mumbai",
          address: "123 Marine Drive",
          contactNumber: "+919876543210",
          totalSeats: 6,
        },
        {
          owner: testOwner._id,
          name: "Elegance Spa",
          city: "Delhi",
          address: "456 Connaught Place",
          contactNumber: "+919876543211",
          totalSeats: 4,
        },
      ]);

      const res = await request(app).get("/api/v1/salons");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.salons.length).toBe(2);
      expect(res.body.data.pagination.totalSalons).toBe(2);
    });

    it("should filter salons by city query parameter", async () => {
      await Salon.create([
        {
          owner: testOwner._id,
          name: "Mumbai Cut",
          city: "Mumbai",
          address: "Andheri West",
          contactNumber: "+919876543210",
        },
        {
          owner: testOwner._id,
          name: "Delhi Salon",
          city: "Delhi",
          address: "Saket",
          contactNumber: "+919876543211",
        },
      ]);

      const res = await request(app).get("/api/v1/salons?city=Mumbai");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.salons.length).toBe(1);
      expect(res.body.data.salons[0].name).toBe("Mumbai Cut");
    });
  });

  describe("GET /api/v1/salons/:id", () => {
    it("should fetch salon details and live availableSeats for a valid ID (200 OK)", async () => {
      const salon = await Salon.create({
        owner: testOwner._id,
        name: "Royal Touch Studio",
        city: "Bangalore",
        address: "789 Indiranagar",
        contactNumber: "+919876543210",
        totalSeats: 8,
      });

      const res = await request(app).get(`/api/v1/salons/${salon._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(salon._id.toString());
      expect(res.body.data.name).toBe("Royal Touch Studio");
      expect(res.body.data.availableSeats).toBe(8);
    });

    it("should return 404 Not Found for non-existent salon ID", async () => {
      const randomObjectId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/salons/${randomObjectId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Salon not found/i);
    });
  });

  describe("Role-Based Access Control (RBAC): Salon Registration", () => {
    it("should reject salon registration without authentication token (401 Unauthorized)", async () => {
      const res = await request(app)
        .post("/api/v1/salons/register")
        .send({
          name: "Unauthorized Salon",
          city: "Mumbai",
          address: "Central Street",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
