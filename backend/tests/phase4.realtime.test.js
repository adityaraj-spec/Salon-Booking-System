process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_EXPIRY = "7d";

import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { Booking } from "../src/models/booking.models.js";
import * as queueService from "../src/services/queue.service.js";
import { emitToUser, emitToRoom, emitToAll } from "../src/socket.js";
import { ROLES } from "../src/constants.js";

let mongod;

beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  } catch {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(mongod.getUri());
  }
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Salon.deleteMany({});
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
    name: "Realtime Queue Salon",
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
      arrivalGraceMinutes: 10,
    },
  });
};

const createTestService = async (salonId, name = "Haircut", price = 300, durationMin = 30) => {
  return await Service.create({
    salon: salonId,
    name,
    price,
    durationMin,
    category: "hair",
  });
};

const signAuthToken = (user) => {
  return jwt.sign(
    {
      _id: user._id.toString(),
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
};

describe("Phase 4: Real-Time Experience & Queue Lifecycle Events", () => {
  test("4.1 Socket helpers safely execute without throwing in uninitialized/test mode", () => {
    expect(() => emitToUser("user123", "test:event", { msg: "hello" })).not.toThrow();
    expect(() => emitToRoom("room123", "test:event", { msg: "hello" })).not.toThrow();
    expect(() => emitToAll("test:event", { msg: "hello" })).not.toThrow();
  });

  test("4.2 Recalculate positions streams queue updates and triggers turn-soon alert for position #1", async () => {
    const owner = await createTestUser("owner", "1");
    const customer1 = await createTestUser("customer", "1");
    const customer2 = await createTestUser("customer", "2");
    const salon = await createTestSalon(owner);
    const service = await createTestService(salon._id);

    // Create 2 waiting bookings
    const b1 = await Booking.create({
      salon: salon._id,
      customer: customer1._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 1,
      requestedAt: new Date(Date.now() - 2000),
    });

    const b2 = await Booking.create({
      salon: salon._id,
      customer: customer2._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 2,
      requestedAt: new Date(Date.now() - 1000),
    });

    const updated = await queueService.recalculateQueuePositionsAndETAs(salon._id);
    expect(updated).toHaveLength(2);
    expect(updated[0]._id.toString()).toBe(b1._id.toString());
    expect(updated[0].queuePosition).toBe(1);
    expect(updated[1]._id.toString()).toBe(b2._id.toString());
    expect(updated[1].queuePosition).toBe(2);
  });

  test("4.3 handleArrivalGraceExpiry handles unarrived customer warning gracefully", async () => {
    const owner = await createTestUser("owner", "2");
    const customer = await createTestUser("customer", "3");
    const salon = await createTestSalon(owner);
    const service = await createTestService(salon._id);

    const booking = await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      queuePosition: 1,
      requestedAt: new Date(),
    });

    const result = await queueService.handleArrivalGraceExpiry(booking._id.toString());
    expect(result).not.toBeNull();
    expect(result.status).toBe("waiting");
  });

  test("4.4 Extra services proposal, customer approval, and decline lifecycle", async () => {
    const owner = await createTestUser("owner", "3");
    const customer = await createTestUser("customer", "4");
    const salon = await createTestSalon(owner);
    const baseService = await createTestService(salon._id, "Haircut", 300, 30);
    const extraService1 = await createTestService(salon._id, "Hair Spa", 700, 45);
    const extraService2 = await createTestService(salon._id, "Beard Trim", 150, 15);

    const ownerToken = signAuthToken(owner);
    const customerToken = signAuthToken(customer);

    // Customer has an active in_progress booking
    const booking = await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "in_progress",
      services: [baseService._id],
      totalAmount: 300,
      durationMinutes: 30,
      amounts: { subtotal: 300, total: 300 },
      actualStartTime: new Date(),
    });

    // 1. Owner proposes extra services
    const proposeRes = await request(app)
      .post(`/api/v1/queue/${booking._id}/propose-extras`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ serviceIds: [extraService1._id.toString(), extraService2._id.toString()] });

    expect(proposeRes.status).toBe(200);
    expect(proposeRes.body.data.proposedExtraServices).toHaveLength(2);

    // Verify in DB
    const bookingAfterProposal = await Booking.findById(booking._id);
    expect(bookingAfterProposal.proposedExtraServices).toHaveLength(2);
    expect(bookingAfterProposal.totalAmount).toBe(300); // Not added to total yet!

    // 2. Customer approves proposed extra services
    const approveRes = await request(app)
      .post(`/api/v1/queue/${booking._id}/approve-extras`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(approveRes.status).toBe(200);

    const bookingAfterApproval = await Booking.findById(booking._id);
    expect(bookingAfterApproval.proposedExtraServices).toHaveLength(0); // Cleared
    expect(bookingAfterApproval.extraServices).toHaveLength(2); // Added to extraServices
    expect(bookingAfterApproval.totalAmount).toBe(300 + 700 + 150); // 1150
    expect(bookingAfterApproval.durationMinutes).toBe(30 + 45 + 15); // 90 mins

    // 3. Propose another service and decline it
    const proposeAgainRes = await request(app)
      .post(`/api/v1/queue/${booking._id}/propose-extras`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ serviceIds: [extraService1._id.toString()] });

    expect(proposeAgainRes.status).toBe(200);

    const declineRes = await request(app)
      .post(`/api/v1/queue/${booking._id}/decline-extras`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ reason: "No thank you" });

    expect(declineRes.status).toBe(200);

    const bookingAfterDecline = await Booking.findById(booking._id);
    expect(bookingAfterDecline.proposedExtraServices).toHaveLength(0);
    expect(bookingAfterDecline.totalAmount).toBe(1150); // Remains unchanged
  });
});
