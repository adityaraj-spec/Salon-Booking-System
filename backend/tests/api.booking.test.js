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
import { Booking } from "../src/models/booking.models.js";
import { Service } from "../src/models/service.models.js";

let replSet;
let testCustomer;
let testOwner;
let testSalon;
let testService;
let customerToken;
let ownerToken;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  testOwner = await User.create({
    fullName: "Booking Salon Owner",
    email: "bookingowner@test.com",
    username: "bookingowner",
    password: "password123",
    phonenumber: "+919876543210",
    isVerified: true,
    role: "salonOwner",
  });

  testCustomer = await User.create({
    fullName: "Booking Customer",
    email: "customer@test.com",
    username: "bookingcustomer",
    password: "password123",
    phonenumber: "+919876543211",
    isVerified: true,
    role: "customer",
  });

  customerToken = testCustomer.generateAccessToken();
  ownerToken = testOwner.generateAccessToken();

  testSalon = await Salon.create({
    owner: testOwner._id,
    name: "Elite Grooming",
    city: "Mumbai",
    address: "77 Marine Lines",
    totalSeats: 5,
    operatingHours: [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 1, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 2, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 3, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 4, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "20:00", isClosed: false },
      { dayOfWeek: 6, openTime: "09:00", closeTime: "20:00", isClosed: false },
    ],
  });

  testService = await Service.create({
    salon: testSalon._id,
    name: "Classic Haircut",
    price: 350,
    durationMinutes: 30,
    category: "Hair",
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  await Booking.deleteMany({});
});

describe("Automated API Testing: Booking Operations Suite", () => {
  describe("GET /api/v1/bookings/availability/:salonId", () => {
    it("should reject availability request when date parameter is missing (400 Bad Request)", async () => {
      const res = await request(app).get(`/api/v1/bookings/availability/${testSalon._id}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/date are required/i);
    });

    it("should return available time slots when valid date is provided (200 OK)", async () => {
      const res = await request(app).get(
        `/api/v1/bookings/availability/${testSalon._id}?date=2026-11-20&durationMinutes=30`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe("GET /api/v1/bookings/my-bookings", () => {
    it("should reject unauthenticated request for user bookings (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/v1/bookings/my-bookings");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return user bookings list for authenticated customer (200 OK)", async () => {
      // Create a test booking for the customer
      await Booking.create({
        customer: testCustomer._id,
        salon: testSalon._id,
        services: [testService._id],
        serviceNames: ["Classic Haircut"],
        date: "2026-11-20",
        time: "10:00 AM",
        totalAmount: 350,
        status: "confirmed",
      });

      const res = await request(app)
        .get("/api/v1/bookings/my-bookings")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.bookings)).toBe(true);
      expect(res.body.data.bookings.length).toBe(1);
      expect(res.body.data.bookings[0].totalAmount).toBe(350);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  describe("GET /api/v1/bookings/salon-bookings", () => {
    it("allows a salonOwner role through the owner authorization alias", async () => {
      const res = await request(app)
        .get("/api/v1/bookings/salon-bookings")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.bookings)).toBe(true);
    });
  });

  describe("POST /api/v1/bookings/hold & Status Updates", () => {
    it("should reject hold creation when unauthenticated (401 Unauthorized)", async () => {
      const res = await request(app)
        .post("/api/v1/bookings/hold")
        .send({
          salonId: testSalon._id,
          date: "2026-11-20",
          time: "11:00 AM",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject booking status update without authentication (401 Unauthorized)", async () => {
      const fakeBookingId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/v1/bookings/${fakeBookingId}/status`)
        .send({ status: "confirmed" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
