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
    name: "Analytics Salon",
    owner: ownerUser._id,
    city: "Bangalore",
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

const createTestService = async (salonId, name = "Haircut", price = 350, durationMin = 30) => {
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

describe("Phase 5: Queue Analytics, Capacity Planning & Operational Insights", () => {
  test("5.1 getQueueAnalytics aggregates wait time, duration accuracy, abandonment, and capacity utilization", async () => {
    const owner = await createTestUser("owner", "1");
    const customer = await createTestUser("customer", "1");
    const salon = await createTestSalon(owner);
    const service = await createTestService(salon._id);

    const now = Date.now();

    // 1 Completed booking (requested 40 mins ago, started 25 mins ago, completed 5 mins ago)
    await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "completed",
      services: [service._id],
      durationMinutes: 30,
      totalAmount: 350,
      estimatedWaitMin: 15,
      estimatedWaitMax: 20,
      requestedAt: new Date(now - 40 * 60000),
      actualStartTime: new Date(now - 25 * 60000),
      actualCompletionTime: new Date(now - 5 * 60000),
    });

    // 1 Waiting booking
    await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "waiting",
      services: [service._id],
      durationMinutes: 30,
      queuePosition: 1,
      estimatedWaitMin: 10,
      estimatedWaitMax: 20,
      requestedAt: new Date(now - 5 * 60000),
    });

    // 1 In-progress booking
    await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "in_progress",
      services: [service._id],
      durationMinutes: 30,
      actualStartTime: new Date(now - 10 * 60000),
    });

    // 1 Expired booking (abandonment)
    await Booking.create({
      salon: salon._id,
      customer: customer._id,
      bookingType: "queue",
      status: "expired",
      services: [service._id],
      durationMinutes: 30,
      requestedAt: new Date(now - 60 * 60000),
    });

    const analytics = await queueService.getQueueAnalytics({ salonId: salon._id });

    expect(analytics.counts.total).toBe(4);
    expect(analytics.counts.completed).toBe(1);
    expect(analytics.counts.waiting).toBe(1);
    expect(analytics.counts.in_progress).toBe(1);
    expect(analytics.counts.expired).toBe(1);

    // Abandonment: 1 out of 4 = 25%
    expect(analytics.abandonment.dropouts).toBe(1);
    expect(analytics.abandonment.abandonmentRate).toBe(25);
    expect(analytics.abandonment.completionRate).toBe(25);

    // Live status: 1 waiting + 1 in_progress = 2 active now (out of 10 maxCapacity = 20%)
    expect(analytics.liveStatus.activeNow).toBe(2);
    expect(analytics.liveStatus.capacityUtilization).toBe(20);

    // Wait accuracy
    expect(analytics.efficiency.avgEstimatedWaitMin).toBe(15);
    expect(analytics.efficiency.avgActualWaitMin).toBe(15);
  });

  test("5.2 GET /api/v1/queue/salon/:salonId/analytics returns full metrics for salon owner", async () => {
    const owner = await createTestUser("owner", "2");
    const salon = await createTestSalon(owner);
    const ownerToken = signAuthToken(owner);

    const res = await request(app)
      .get(`/api/v1/queue/salon/${salon._id}/analytics`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.salonId.toString()).toBe(salon._id.toString());
    expect(res.body.data.liveStatus).toBeDefined();
    expect(res.body.data.efficiency).toBeDefined();
    expect(res.body.data.abandonment).toBeDefined();
  });

  test("5.3 GET /api/v1/owner/dashboard and /reports include queue metrics", async () => {
    const owner = await createTestUser("owner", "3");
    const salon = await createTestSalon(owner);
    const ownerToken = signAuthToken(owner);

    // Dashboard check
    const dashRes = await request(app)
      .get("/api/v1/owner/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.stats.queueMetrics).toBeDefined();

    // Reports check
    const reportRes = await request(app)
      .get("/api/v1/owner/reports")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.queueAnalytics).toBeDefined();
  });
});

