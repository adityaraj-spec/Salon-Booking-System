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
import * as queueService from "../src/services/queue.service.js";

import { ROLES } from "../src/constants.js";

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

const createTestSalon = async (ownerUser, overrides = {}) => {
  return await Salon.create({
    name: "Luxury Queue Salon",
    owner: ownerUser._id,
    city: "Mumbai",
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
      maxCapacity: 5,
      requestTimeoutMinutes: 5,
      arrivalGraceMinutes: 15,
      ...(overrides.queueSettings || {}),
    },
    ...overrides,
  });
};

const createTestService = async (salon, name = "Haircut", price = 500, durationMin = 30) => {
  return await Service.create({
    name,
    salon: salon._id,
    price,
    durationMin,
    category: "hair",
  });
};

describe("Phase 2: Dynamic Queue Management Engine Test Suite", () => {
  describe("Queue Discovery & Intake Validation", () => {
    it("should return salon queue details with capacity and wait times", async () => {
      const owner = await createTestUser("owner", "1");
      const salon = await createTestSalon(owner);
      await createTestService(salon);

      const res = await request(app).get(`/api/v1/queue/salon/${salon._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.salon.name).toBe("Luxury Queue Salon");
      expect(res.body.data.summary.maxCapacity).toBe(5);
      expect(res.body.data.summary.isAccepting).toBe(true);
      expect(res.body.data.summary.waitingCount).toBe(0);
      expect(res.body.data.queue).toEqual([]);
    });

    it("should allow a customer to request a position in the queue", async () => {
      const owner = await createTestUser("owner", "2");
      const customer = await createTestUser("customer", "2");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const token = customer.generateAccessToken();

      const res = await request(app)
        .post("/api/v1/queue/request")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          salonId: salon._id.toString(),
          serviceIds: [service._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("requested");
      expect(res.body.data.bookingType).toBe("queue");
      expect(res.body.data.totalAmount).toBe(500);
      expect(res.body.data.verificationPin).toBeDefined();

      const saved = await Booking.findById(res.body.data._id);
      expect(saved).not.toBeNull();
      expect(saved.status).toBe("requested");
    });

    it("should reject queue requests when queue intake is paused", async () => {
      const owner = await createTestUser("owner", "3");
      const customer = await createTestUser("customer", "3");
      const salon = await createTestSalon(owner, {
        queueSettings: { isAccepting: true, isPaused: true, maxCapacity: 5 },
      });
      const service = await createTestService(salon);

      const token = customer.generateAccessToken();

      const res = await request(app)
        .post("/api/v1/queue/request")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          salonId: salon._id.toString(),
          serviceIds: [service._id.toString()],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("temporarily paused");
    });

    it("should enforce maximum queue capacity limit", async () => {
      const owner = await createTestUser("owner", "4");
      const customer = await createTestUser("customer", "4");
      const salon = await createTestSalon(owner, {
        queueSettings: { isAccepting: true, isPaused: false, maxCapacity: 2 },
      });
      const service = await createTestService(salon);
      const token = customer.generateAccessToken();

      // Create 2 existing bookings to fill capacity
      await Booking.create({
        salon: salon._id,
        bookingType: "queue",
        status: "waiting",
        queuePosition: 1,
        totalAmount: 500,
      });
      await Booking.create({
        salon: salon._id,
        bookingType: "queue",
        status: "in_progress",
        totalAmount: 500,
      });

      // Third request should be rejected due to capacity
      const res = await request(app)
        .post("/api/v1/queue/request")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          salonId: salon._id.toString(),
          serviceIds: [service._id.toString()],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("maximum capacity");
    });
  });

  describe("Concurrency & Monotonic Position Assignment", () => {
    it("should assign unique sequential queue positions under concurrent acceptances without duplicates", async () => {
      const owner = await createTestUser("owner", "5");
      const salon = await createTestSalon(owner, { queueSettings: { maxCapacity: 10 } });
      const service = await createTestService(salon);

      const cust1 = await createTestUser("customer", "5a");
      const cust2 = await createTestUser("customer", "5b");
      const cust3 = await createTestUser("customer", "5c");

      // Create 3 requests
      const b1 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust1._id,
        serviceIds: [service._id.toString()],
      });
      const b2 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust2._id,
        serviceIds: [service._id.toString()],
      });
      const b3 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust3._id,
        serviceIds: [service._id.toString()],
      });

      // Concurrently accept all 3 requests
      const acceptPromises = [
        queueService.acceptQueueRequest({ bookingId: b1._id.toString(), ownerId: owner._id, role: "owner" }),
        queueService.acceptQueueRequest({ bookingId: b2._id.toString(), ownerId: owner._id, role: "owner" }),
        queueService.acceptQueueRequest({ bookingId: b3._id.toString(), ownerId: owner._id, role: "owner" }),
      ];

      const acceptedResults = await Promise.all(acceptPromises);
      const positions = acceptedResults.map((r) => r.queuePosition).sort((a, b) => a - b);

      expect(positions).toEqual([1, 2, 3]);
    });
  });

  describe("Queue Request Acceptance, Rejection & Timeout Expiry", () => {
    it("should allow salon owner to accept a queue request and view it in queue", async () => {
      const owner = await createTestUser("owner", "6");
      const customer = await createTestUser("customer", "6");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const reqBooking = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      const ownerToken = owner.generateAccessToken();

      const acceptRes = await request(app)
        .post(`/api/v1/queue/${reqBooking._id}/accept`)
        .set("Cookie", [`accessToken=${ownerToken}`]);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe("waiting");
      expect(acceptRes.body.data.queuePosition).toBe(1);

      // Verify queue retrieval
      const queueRes = await request(app).get(`/api/v1/queue/salon/${salon._id}`);
      expect(queueRes.body.data.summary.waitingCount).toBe(1);
      expect(queueRes.body.data.queue[0]._id.toString()).toBe(reqBooking._id.toString());
    });

    it("should allow salon owner to reject an incoming request with reason", async () => {
      const owner = await createTestUser("owner", "7");
      const customer = await createTestUser("customer", "7");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const reqBooking = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      const ownerToken = owner.generateAccessToken();

      const rejectRes = await request(app)
        .post(`/api/v1/queue/${reqBooking._id}/reject`)
        .set("Cookie", [`accessToken=${ownerToken}`])
        .send({ reason: "Fully booked for specialized services" });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe("rejected");
      expect(rejectRes.body.data.rejectionReason).toBe("Fully booked for specialized services");

      const saved = await Booking.findById(reqBooking._id);
      expect(saved.status).toBe("rejected");
    });

    it("should expire unanswered queue requests via worker handler", async () => {
      const owner = await createTestUser("owner", "8");
      const customer = await createTestUser("customer", "8");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon);

      const reqBooking = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      expect(reqBooking.status).toBe("requested");

      // Trigger expiry
      const expired = await queueService.expireQueueRequest(reqBooking._id.toString());
      expect(expired.status).toBe("expired");

      const saved = await Booking.findById(reqBooking._id);
      expect(saved.status).toBe("expired");
    });
  });

  describe("Customer Arrival, Service In-Progress & Completion Lifecycle", () => {
    it("should progress booking through arrived -> in_progress -> completed with PIN verification", async () => {
      const owner = await createTestUser("owner", "9");
      const customer = await createTestUser("customer", "9");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon, "Pedicure", 800, 45);

      const staff = await Staff.create({
        salon: salon._id,
        name: "Expert Stylist Priya",
        isActive: true,
      });

      const booking = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: customer._id,
        serviceIds: [service._id.toString()],
      });

      await queueService.acceptQueueRequest({
        bookingId: booking._id.toString(),
        ownerId: owner._id,
        role: "owner",
      });

      const custToken = customer.generateAccessToken();
      const ownerToken = owner.generateAccessToken();

      // 1. Customer check-in upon arrival
      const checkInRes = await request(app)
        .post(`/api/v1/queue/${booking._id}/check-in`)
        .set("Cookie", [`accessToken=${custToken}`]);

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.data.status).toBe("arrived");
      expect(checkInRes.body.data.arrivedAt).toBeDefined();

      // 2. Start service with valid PIN & assigned staff
      const startRes = await request(app)
        .post(`/api/v1/queue/${booking._id}/start`)
        .set("Cookie", [`accessToken=${ownerToken}`])
        .send({
          staffId: staff._id.toString(),
          pin: booking.verificationPin,
        });

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe("in_progress");
      expect(startRes.body.data.staffName).toBe("Expert Stylist Priya");
      expect(startRes.body.data.actualStartTime).toBeDefined();

      // 3. Complete service with paymentMethod
      const completeRes = await request(app)
        .post(`/api/v1/queue/${booking._id}/complete`)
        .set("Cookie", [`accessToken=${ownerToken}`])
        .send({ paymentMethod: "upi" });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe("completed");
      expect(completeRes.body.data.paymentStatus).toBe("paid");
      expect(completeRes.body.data.paymentMethod).toBe("upi");
      expect(completeRes.body.data.actualCompletionTime).toBeDefined();

      // Verify salon queue is now clear
      const queueRes = await request(app).get(`/api/v1/queue/salon/${salon._id}`);
      expect(queueRes.body.data.summary.waitingCount).toBe(0);
      expect(queueRes.body.data.summary.inProgressCount).toBe(0);
    });
  });

  describe("Dynamic Multi-Staff Capability Matching & ETA Engine", () => {
    it("should partition wait time estimates across capable staff members", async () => {
      const owner = await createTestUser("owner", "10");
      const salon = await createTestSalon(owner);

      const haircutSrv = await createTestService(salon, "Haircut", 400, 30);
      const colorSrv = await createTestService(salon, "Hair Coloring", 1500, 60);

      // Staff 1: Haircut specialist
      const staff1 = await Staff.create({
        salon: salon._id,
        name: "Stylist Ravi",
        isActive: true,
        services: [haircutSrv._id],
      });

      // Staff 2: Coloring specialist
      const staff2 = await Staff.create({
        salon: salon._id,
        name: "Stylist Ananya",
        isActive: true,
        services: [colorSrv._id],
      });

      const cust1 = await createTestUser("customer", "10a");
      const cust2 = await createTestUser("customer", "10b");
      const cust3 = await createTestUser("customer", "10c");

      // Customer 1: Haircut (should be served by Ravi -> 0 min wait)
      const b1 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust1._id,
        serviceIds: [haircutSrv._id.toString()],
      });
      await queueService.acceptQueueRequest({ bookingId: b1._id.toString(), ownerId: owner._id, role: "owner" });

      // Customer 2: Color (should be served by Ananya -> 0 min wait because Ananya is free!)
      const b2 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust2._id,
        serviceIds: [colorSrv._id.toString()],
      });
      await queueService.acceptQueueRequest({ bookingId: b2._id.toString(), ownerId: owner._id, role: "owner" });

      // Customer 3: Another Haircut (Ravi is busy for 30 min, so wait time should be ~30 min)
      const b3 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust3._id,
        serviceIds: [haircutSrv._id.toString()],
      });
      await queueService.acceptQueueRequest({ bookingId: b3._id.toString(), ownerId: owner._id, role: "owner" });

      const updatedB1 = await Booking.findById(b1._id);
      const updatedB2 = await Booking.findById(b2._id);
      const updatedB3 = await Booking.findById(b3._id);

      expect(updatedB1.estimatedWaitMin).toBe(0);
      expect(updatedB2.estimatedWaitMin).toBe(0); // Free coloring specialist
      expect(updatedB3.estimatedWaitMin).toBe(30); // Waiting behind first haircut on Ravi
    });
  });

  describe("Queue Reordering & Configuration Management", () => {
    it("should allow salon owner to reorder waiting customers and update queue settings", async () => {
      const owner = await createTestUser("owner", "11");
      const salon = await createTestSalon(owner);
      const service = await createTestService(salon, "Blowdry", 300, 20);

      const cust1 = await createTestUser("customer", "11a");
      const cust2 = await createTestUser("customer", "11b");

      const b1 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust1._id,
        serviceIds: [service._id.toString()],
      });
      await queueService.acceptQueueRequest({ bookingId: b1._id.toString(), ownerId: owner._id, role: "owner" });

      const b2 = await queueService.requestQueuePosition({
        salonId: salon._id.toString(),
        customerId: cust2._id,
        serviceIds: [service._id.toString()],
      });
      await queueService.acceptQueueRequest({ bookingId: b2._id.toString(), ownerId: owner._id, role: "owner" });

      const ownerToken = owner.generateAccessToken();

      // Reorder: swap b2 to position 1, b1 to position 2
      const reorderRes = await request(app)
        .put(`/api/v1/queue/salon/${salon._id}/reorder`)
        .set("Cookie", [`accessToken=${ownerToken}`])
        .send({ bookingIds: [b2._id.toString(), b1._id.toString()] });

      expect(reorderRes.status).toBe(200);

      const refreshedB2 = await Booking.findById(b2._id);
      const refreshedB1 = await Booking.findById(b1._id);
      expect(refreshedB2.queuePosition).toBe(1);
      expect(refreshedB1.queuePosition).toBe(2);

      // Update queue settings (e.g. pause queue and change capacity)
      const settingsRes = await request(app)
        .patch(`/api/v1/queue/salon/${salon._id}/settings`)
        .set("Cookie", [`accessToken=${ownerToken}`])
        .send({ isPaused: true, maxCapacity: 25 });

      expect(settingsRes.status).toBe(200);
      expect(settingsRes.body.data.isPaused).toBe(true);
      expect(settingsRes.body.data.maxCapacity).toBe(25);
    });
  });
});
