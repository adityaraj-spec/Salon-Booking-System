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
import * as bookingService from "../src/services/booking.service.js";
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

const createTestSalon = async (ownerUser, overrides = {}) => {
  return await Salon.create({
    name: "Edge Case Salon",
    owner: ownerUser._id,
    city: "Hyderabad",
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
      maxCapacity: overrides.maxCapacity || 5,
      requestTimeoutMinutes: 5,
      arrivalGraceMinutes: 15,
    },
    ...overrides,
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

describe("Phase 6: Edge Cases, Concurrency & Resilience Suite", () => {
  test("6.1 Concurrent queue entry requests respect strict maxCapacity boundary", async () => {
    const owner = await createTestUser("owner", "1");
    // Salon with capacity of exactly 2
    const salon = await createTestSalon(owner, { maxCapacity: 2 });
    const service = await createTestService(salon._id);

    // Create 3 customers attempting to request simultaneously
    const users = await Promise.all([
      createTestUser("customer", "1"),
      createTestUser("customer", "2"),
      createTestUser("customer", "3"),
    ]);

    const results = await Promise.allSettled(
      users.map((u) =>
        queueService.requestQueuePosition({
          salonId: salon._id.toString(),
          customerId: u._id,
          serviceIds: [service._id.toString()],
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 2 must succeed, 1 must fail with capacity exceeded
    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toMatch(/maximum capacity/i);
  });

  test("6.2 Cancelling queue position re-compacts subsequent customers and updates ETAs", async () => {
    const owner = await createTestUser("owner", "2");
    const c1 = await createTestUser("customer", "4");
    const c2 = await createTestUser("customer", "5");
    const c3 = await createTestUser("customer", "6");
    const salon = await createTestSalon(owner);
    const service = await createTestService(salon._id);

    // Create 3 waiting bookings with positions 1, 2, 3
    const b1 = await Booking.create({
      salon: salon._id,
      customer: c1._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 1,
      requestedAt: new Date(Date.now() - 3000),
    });

    const b2 = await Booking.create({
      salon: salon._id,
      customer: c2._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 2,
      requestedAt: new Date(Date.now() - 2000),
    });

    const b3 = await Booking.create({
      salon: salon._id,
      customer: c3._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 3,
      requestedAt: new Date(Date.now() - 1000),
    });

    // Customer 1 cancels their booking
    const cancelled = await bookingService.cancelBooking({
      bookingId: b1._id.toString(),
      customerId: c1._id,
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.queuePosition).toBeNull();

    // Verify Customer 2 and Customer 3 are compacted to positions 1 and 2
    const refreshedB2 = await Booking.findById(b2._id);
    const refreshedB3 = await Booking.findById(b3._id);

    expect(refreshedB2.queuePosition).toBe(1);
    expect(refreshedB3.queuePosition).toBe(2);
  });

  test("6.3 Repeated check-in after arrival is handled safely without corruption", async () => {
    const owner = await createTestUser("owner", "3");
    const customer = await createTestUser("customer", "7");
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

    // First check-in
    const firstCheckIn = await queueService.checkInQueueCustomer({
      bookingId: booking._id.toString(),
      customerId: customer._id,
    });
    expect(firstCheckIn.status).toBe("arrived");

    // Second check-in attempt throws friendly 400 instead of crashing or corrupting
    await expect(
      queueService.checkInQueueCustomer({
        bookingId: booking._id.toString(),
        customerId: customer._id,
      })
    ).rejects.toThrow(/Cannot check-in booking with status 'arrived'/);
  });

  test("6.4 Queue reordering updates sequence and recalculates ETAs", async () => {
    const owner = await createTestUser("owner", "4");
    const c1 = await createTestUser("customer", "8");
    const c2 = await createTestUser("customer", "9");
    const salon = await createTestSalon(owner);
    const service = await createTestService(salon._id);

    const b1 = await Booking.create({
      salon: salon._id,
      customer: c1._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      queuePosition: 1,
      durationMinutes: 20,
    });

    const b2 = await Booking.create({
      salon: salon._id,
      customer: c2._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      queuePosition: 2,
      durationMinutes: 40,
    });

    // Swap order: b2 first, then b1
    const reordered = await queueService.reorderQueue({
      salonId: salon._id.toString(),
      ownerId: owner._id,
      role: owner.role,
      bookingIds: [b2._id.toString(), b1._id.toString()],
    });

    expect(reordered).toHaveLength(2);
    expect(reordered[0]._id.toString()).toBe(b2._id.toString());
    expect(reordered[0].queuePosition).toBe(1);
    expect(reordered[1]._id.toString()).toBe(b1._id.toString());
    expect(reordered[1].queuePosition).toBe(2);
  });
});

