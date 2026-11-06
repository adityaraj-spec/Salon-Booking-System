process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_EXPIRY = "7d";

import crypto from "crypto";
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
import { getZonedTimeParts, parseZonedDateTime } from "../src/utils/salonTime.js";
import { validateOperatingHours } from "../src/utils/timeRange.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
}, 60000);

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

describe("Phase 1: Existing System Stabilization Test Suite", () => {
  describe("Authentication: Stale Token Cleanup & Password Recovery", () => {
    it("should clear cookies when refreshing with an invalid or expired token", async () => {
      const res = await request(app)
        .post("/api/v1/users/refresh-token")
        .set("Cookie", ["refreshToken=invalid_garbage_token_value"]);

      expect(res.status).toBe(401);
      const setCookies = res.headers["set-cookie"] || [];
      const hasClearedAccessToken = setCookies.some(
        (c) => c.includes("accessToken=;") || c.includes("accessToken=deleted") || c.includes("Expires=Thu, 01 Jan 1970")
      );
      const hasClearedRefreshToken = setCookies.some(
        (c) => c.includes("refreshToken=;") || c.includes("refreshToken=deleted") || c.includes("Expires=Thu, 01 Jan 1970")
      );
      expect(hasClearedAccessToken).toBe(true);
      expect(hasClearedRefreshToken).toBe(true);
    });

    it("should execute complete forgot-password and reset-password lifecycle", async () => {
      const user = await User.create({
        fullName: "Test Forgot User",
        email: "forgot@test.com",
        username: "forgotuser",
        password: "OldPassword123!",
        phonenumber: "+919876543210",
        role: ROLES.CUSTOMER,
        isVerified: true,
      });

      // 1. Request password reset
      const forgotRes = await request(app)
        .post("/api/v1/users/forgot-password")
        .send({ email: "forgot@test.com" });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.resetPasswordToken).toBeDefined();
      expect(updatedUser.resetPasswordExpiry).toBeDefined();
      expect(new Date(updatedUser.resetPasswordExpiry).getTime()).toBeGreaterThan(Date.now());

      // 2. Reject reset with invalid token
      const invalidResetRes = await request(app)
        .post("/api/v1/users/reset-password")
        .send({ token: "wrong_token_xyz", newPassword: "NewSecurePassword123!" });

      expect(invalidResetRes.status).toBe(400);

      // 3. For test verification, generate known token and update user hash
      const validToken = "my_super_secret_test_reset_token_1234567890";
      const tokenHash = crypto.createHash("sha256").update(validToken).digest("hex");
      updatedUser.resetPasswordToken = tokenHash;
      updatedUser.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await updatedUser.save();

      // 4. Successful password reset
      const resetRes = await request(app)
        .post("/api/v1/users/reset-password")
        .send({ token: validToken, newPassword: "NewSecurePassword123!" });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 5. Verify user can now log in with the new password
      const reloadedUser = await User.findById(user._id);
      expect(reloadedUser.resetPasswordToken).toBeUndefined();
      expect(await reloadedUser.isPasswordcorrect("NewSecurePassword123!")).toBe(true);
    });
  });

  describe("Authorization & IDOR Defense-in-Depth", () => {
    it("should prevent a customer from creating staff via route-level role guard", async () => {
      const customer = await User.create({
        fullName: "Customer Normal",
        email: "customer@test.com",
        username: "customer1",
        password: "Password123!",
        phonenumber: "+919876543211",
        role: ROLES.CUSTOMER,
        isVerified: true,
      });

      const owner = await User.create({
        fullName: "Salon Owner",
        email: "owner@test.com",
        username: "owner1",
        password: "Password123!",
        phonenumber: "+919876543212",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Prime Salon",
        city: "Mumbai",
        operatingHours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false }],
      });

      const token = customer.generateAccessToken();

      const res = await request(app)
        .post("/api/v1/staff/add")
        .set("Authorization", `Bearer ${token}`)
        .send({
          salonId: salon._id.toString(),
          name: "Attacker Staff",
          role: "Stylist",
        });

      // Role guard blocks with 403 Forbidden
      expect(res.status).toBe(403);
    });

    it("should prevent an owner from modifying or deleting staff of another owner (IDOR)", async () => {
      const ownerA = await User.create({
        fullName: "Owner A",
        email: "ownerA@test.com",
        username: "ownerA",
        password: "Password123!",
        phonenumber: "+919876543213",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const ownerB = await User.create({
        fullName: "Owner B",
        email: "ownerB@test.com",
        username: "ownerB",
        password: "Password123!",
        phonenumber: "+919876543214",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const salonA = await Salon.create({
        owner: ownerA._id,
        name: "Salon A",
        city: "Pune",
      });

      const staffA = await Staff.create({
        salon: salonA._id,
        name: "Staff of A",
        role: "Barber",
      });

      const tokenB = ownerB.generateAccessToken();

      // Owner B attempts to delete Staff of Salon A
      const deleteRes = await request(app)
        .delete(`/api/v1/staff/${staffA._id}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.success).toBe(false);

      // Verify staff still exists in DB
      const staffCheck = await Staff.findById(staffA._id);
      expect(staffCheck).not.toBeNull();
    });

    it("should prevent an owner from modifying services of another owner (IDOR)", async () => {
      const ownerA = await User.create({
        fullName: "Owner Alpha",
        email: "alpha@test.com",
        username: "owneralpha",
        password: "Password123!",
        phonenumber: "+919876543215",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const ownerB = await User.create({
        fullName: "Owner Beta",
        email: "beta@test.com",
        username: "ownerbeta",
        password: "Password123!",
        phonenumber: "+919876543216",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const salonA = await Salon.create({
        owner: ownerA._id,
        name: "Alpha Salon",
        city: "Delhi",
      });

      const serviceA = await Service.create({
        salon: salonA._id,
        name: "Beard Trim",
        price: 250,
      });

      const tokenB = ownerB.generateAccessToken();

      // Owner B attempts to patch Service of Salon A
      const patchRes = await request(app)
        .patch(`/api/v1/services/${serviceA._id}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ price: 10 });

      expect(patchRes.status).toBe(403);

      // Verify price was unchanged
      const serviceCheck = await Service.findById(serviceA._id);
      expect(serviceCheck.price).toBe(250);
    });

    it("should prevent an owner from accessing another salon's bookings via salon-bookings IDOR", async () => {
      const ownerA = await User.create({
        fullName: "Owner 1",
        email: "owner1@test.com",
        username: "owner1_id",
        password: "Password123!",
        phonenumber: "+919876543217",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const ownerB = await User.create({
        fullName: "Owner 2",
        email: "owner2@test.com",
        username: "owner2_id",
        password: "Password123!",
        phonenumber: "+919876543218",
        role: ROLES.OWNER,
        isVerified: true,
      });

      const salonA = await Salon.create({ owner: ownerA._id, name: "Salon A", city: "Delhi" });
      const salonB = await Salon.create({ owner: ownerB._id, name: "Salon B", city: "Delhi" });

      const tokenA = ownerA.generateAccessToken();

      // Owner A attempts to query bookings for Salon B
      const res = await request(app)
        .get(`/api/v1/bookings/salon-bookings?salonId=${salonB._id}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Timezone Handling & Local Operating Window Calculations", () => {
    it("should accurately convert between salon local time and UTC timestamp", () => {
      // 10:00 AM in Asia/Kolkata (IST = UTC+5:30) on 2026-08-01 is 04:30 AM UTC
      const parsedUtc = parseZonedDateTime("2026-08-01", "10:00", "Asia/Kolkata");
      expect(parsedUtc.toISOString()).toBe("2026-08-01T04:30:00.000Z");

      const zoned = getZonedTimeParts(parsedUtc, "Asia/Kolkata");
      expect(zoned.hours).toBe(10);
      expect(zoned.minutes).toBe(0);
      expect(zoned.totalMinutes).toBe(600);
      expect(zoned.dateStr).toBe("2026-08-01");
      expect(zoned.dayOfWeek).toBe(6); // Saturday
    });

    it("should validate operating hours in Asia/Kolkata timezone without treating UTC hours as local", () => {
      const salon = {
        timezone: "Asia/Kolkata",
        operatingHours: [
          { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }, // Saturday
        ],
      };

      // 10:00 AM to 11:00 AM IST (which is 04:30 - 05:30 UTC)
      const validStart = new Date("2026-08-01T04:30:00.000Z");
      const validEnd = new Date("2026-08-01T05:30:00.000Z");
      expect(() => validateOperatingHours(validStart, validEnd, salon)).not.toThrow();

      // 08:30 AM IST (outside 09:00 - 21:00) -> 03:00 UTC
      const earlyStart = new Date("2026-08-01T03:00:00.000Z");
      const earlyEnd = new Date("2026-08-01T04:00:00.000Z");
      expect(() => validateOperatingHours(earlyStart, earlyEnd, salon)).toThrow(/operating hours/);
    });
  });
});
