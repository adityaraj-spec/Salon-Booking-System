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
import { Salon } from "../src/models/salon.models.js";
import { Staff } from "../src/models/staff.models.js";
import { Service } from "../src/models/service.models.js";
import { Booking } from "../src/models/booking.models.js";
import { ROLES } from "../src/constants.js";
import * as queueService from "../src/services/queue.service.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Salon.deleteMany({});
  await Staff.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
});

const createTestUser = async (roleType = "customer", suffix = "1") => {
  const role = roleType === "owner" ? ROLES.OWNER : roleType === "admin" ? ROLES.ADMIN : ROLES.CUSTOMER;
  return await User.create({
    username: `${roleType}_${suffix}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    fullName: `Test ${roleType} ${suffix}`,
    email: `${roleType}${suffix}_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
    password: "Password123!",
    phonenumber: `987654321${suffix.slice(0, 1)}`,
    role,
    isVerified: true,
  });
};

const createTestSalon = async (ownerUser) => {
  return await Salon.create({
    name: "Phase 3 Transformation Salon",
    owner: ownerUser._id,
    city: "Delhi",
    isOpen: true,
    operatingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      dayOfWeek: day,
      openTime: "00:00",
      closeTime: "23:59",
      isClosed: false,
    })),
    queueSettings: {
      isAccepting: true,
      isPaused: false,
      maxCapacity: 10,
      requestTimeoutMinutes: 5,
      arrivalGraceMinutes: 15,
    },
  });
};

const createTestService = async (salon, name = "Hair Styling", price = 600, durationMin = 35) => {
  return await Service.create({
    name,
    salon: salon._id,
    price,
    durationMin,
    category: "hair",
  });
};

describe("Phase 3: Booking Lifecycle Migration Test Suite", () => {
  describe("Coexistence of Queue & Legacy Bookings", () => {
    it("should return both queue bookings and historical fixed-slot bookings in customer booking queries", async () => {
      const owner = await createTestUser("owner", "1");
      const customer = await createTestUser("customer", "1");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      // 1. Create a historical legacy booking with fixed slot
      const legacyBooking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        bookingType: "legacy",
        date: "2026-05-15",
        time: "14:00",
        startTime: new Date("2026-05-15T14:00:00Z"),
        endTime: new Date("2026-05-15T14:35:00Z"),
        services: [service._id],
        serviceNames: [service.name],
        totalAmount: 600,
        status: "confirmed",
      });

      // 2. Create a new queue booking
      const queueBooking = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });
      await queueService.acceptQueueRequest({
        bookingId: queueBooking._id.toString(),
        ownerId: owner._id,
        role: "owner",
      });

      const customerToken = customer.generateAccessToken();

      const res = await request(app)
        .get("/api/v1/bookings/my-bookings")
        .set("Cookie", [`accessToken=${customerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(2);

      const returnedLegacy = res.body.data.bookings.find((b) => b._id === legacyBooking._id.toString());
      const returnedQueue = res.body.data.bookings.find((b) => b._id === queueBooking._id.toString());

      expect(returnedLegacy).toBeDefined();
      expect(returnedLegacy.date).toBe("2026-05-15");
      expect(returnedLegacy.time).toBe("14:00");
      expect(returnedLegacy.bookingType).toBe("legacy");

      expect(returnedQueue).toBeDefined();
      expect(returnedQueue.bookingType).toBe("queue");
      expect(returnedQueue.status).toBe("waiting");
      expect(returnedQueue.queuePosition).toBe(1);
    });

    it("should return queue bookings with customer info in salon owner queries", async () => {
      const owner = await createTestUser("owner", "2");
      const customer = await createTestUser("customer", "2");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const qb = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      const ownerToken = owner.generateAccessToken();

      const res = await request(app)
        .get(`/api/v1/bookings/salon-bookings?salonId=${salon._id}`)
        .set("Cookie", [`accessToken=${ownerToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(1);
      expect(res.body.data.bookings[0]._id).toBe(qb._id.toString());
      expect(res.body.data.bookings[0].bookingType).toBe("queue");
      expect(res.body.data.bookings[0].status).toBe("requested");
    });
  });

  describe("Lifecycle State Transitions & Salon Owner Queue Management", () => {
    it("should allow salon owner to update queue booking through all extended statuses", async () => {
      const owner = await createTestUser("owner", "3");
      const customer = await createTestUser("customer", "3");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const qb = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      const ownerToken = owner.generateAccessToken();

      // Test transitioning through updateBookingStatus
      for (const nextStatus of ["waiting", "arrived", "in_progress", "completed"]) {
        const updateRes = await request(app)
          .patch(`/api/v1/bookings/${qb._id}/status`)
          .set("Cookie", [`accessToken=${ownerToken}`])
          .send({ status: nextStatus });

        expect(updateRes.status).toBe(200);
      }

      const finalBooking = await Booking.findById(qb._id);
      expect(finalBooking.status).toBe("completed");
    });

    it("should accurately reflect queue metrics in salon discovery endpoint", async () => {
      const owner = await createTestUser("owner", "4");
      const customer = await createTestUser("customer", "4");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      // Join and accept into queue
      const qb = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });
      await queueService.acceptQueueRequest({
        bookingId: qb._id.toString(),
        ownerId: owner._id,
        role: "owner",
      });

      // Query public queue details
      const res = await request(app).get(`/api/v1/queue/salon/${salon._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.summary.waitingCount).toBe(1);
      expect(res.body.data.summary.maxCapacity).toBe(10);
      expect(res.body.data.summary.isAccepting).toBe(true);
      expect(res.body.data.summary.estimatedWaitRangeForNewCustomer).toBeDefined();
    });
  });
});

