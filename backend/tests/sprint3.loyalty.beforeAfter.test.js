process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_EXPIRY = "7d";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { User } from "../src/models/user.models.js";
import { LoyaltyLedger } from "../src/models/loyaltyLedger.model.js";
import { createHold } from "../src/services/hold.service.js";
import { initiateBookingFromHold, cancelPendingBooking } from "../src/services/booking.service.js";
import {
  calculateLoyaltyDiscount,
  awardBookingCompletionPoints,
  reversePointsForBooking,
  getLoyaltyLedgerSummary,
  POINT_VALUE_INR,
  MAX_REDEMPTION_RATIO,
} from "../src/services/loyalty.service.js";

describe("Sprint 3.3 (Before/After Gallery) & Sprint 3.4 (Loyalty Points Ledger & Checkout)", () => {
  let replSet;
  let salon;
  let customer;
  let owner;
  let service;
  let authToken;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
    await BookingHold.createIndexes();
    await Booking.createIndexes();
    await Salon.createIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    await BookingHold.deleteMany({});
    await Booking.deleteMany({});
    await Salon.deleteMany({});
    await Service.deleteMany({});
    await User.deleteMany({});
    await LoyaltyLedger.deleteMany({});

    owner = await User.create({
      username: `owner_${Date.now()}`,
      fullName: "Owner Bob",
      email: `owner_${Date.now()}@test.com`,
      phonenumber: "+919876543210",
      password: "password123",
      role: "salonOwner",
    });

    customer = await User.create({
      username: `cust_${Date.now()}`,
      fullName: "Alice Smith",
      email: `cust_${Date.now()}@test.com`,
      phonenumber: "+919876543219",
      password: "password123",
      role: "customer",
      loyaltyPoints: 100, // 100 points = ₹50 value
    });

    authToken = customer.generateAccessToken();

    salon = await Salon.create({
      owner: owner._id,
      name: "Glamour Studios",
      address: "100 Luxury Road",
      city: "Mumbai",
      totalSeats: 4,
      operatingHours: [
        { dayOfWeek: 6, openTime: "08:00", closeTime: "22:00", isClosed: false },
      ],
      beforeAfterPhotos: [
        {
          beforeUrl: "https://example.com/hair-before.jpg",
          afterUrl: "https://example.com/hair-after.jpg",
          serviceName: "Balayage Color",
          stylistName: "Anita Sharma",
          title: "Brunette to Honey Blonde",
        },
      ],
    });

    service = await Service.create({
      salon: salon._id,
      name: "Hair Balayage",
      price: 1000,
      duration: 60,
    });
  });

  describe("Sprint 3.3: Before/After Photos Schema & Retrieval", () => {
    it("persists and retrieves beforeAfterPhotos on Salon model", async () => {
      const fetchedSalon = await Salon.findById(salon._id);
      expect(fetchedSalon.beforeAfterPhotos).toBeDefined();
      expect(fetchedSalon.beforeAfterPhotos.length).toBe(1);
      expect(fetchedSalon.beforeAfterPhotos[0].beforeUrl).toBe("https://example.com/hair-before.jpg");
      expect(fetchedSalon.beforeAfterPhotos[0].afterUrl).toBe("https://example.com/hair-after.jpg");
      expect(fetchedSalon.beforeAfterPhotos[0].serviceName).toBe("Balayage Color");
      expect(fetchedSalon.beforeAfterPhotos[0].stylistName).toBe("Anita Sharma");
    });

    it("serves beforeAfterPhotos in GET /api/v1/salons/:id", async () => {
      const res = await request(app).get(`/api/v1/salons/${salon._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.beforeAfterPhotos).toBeDefined();
      expect(res.body.data.beforeAfterPhotos.length).toBe(1);
      expect(res.body.data.beforeAfterPhotos[0].serviceName).toBe("Balayage Color");
    });
  });

  describe("Sprint 3.4: Loyalty Points Ledger Calculation & Rules", () => {
    it("calculates 1 pt = ₹0.50 discount capped at 20% of subtotal", () => {
      // Subtotal = ₹1000. 20% cap = ₹200 max discount = 400 max points.
      // Customer has 100 points -> 100 * 0.50 = ₹50 discount. Final total = ₹950.
      const calc1 = calculateLoyaltyDiscount(100, 1000);
      expect(calc1.maxRedeemablePoints).toBe(100);
      expect(calc1.discountAmount).toBe(50);
      expect(calc1.finalTotal).toBe(950);

      // Customer has 500 points -> cap at 400 points (₹200 discount). Final total = ₹800.
      const calc2 = calculateLoyaltyDiscount(500, 1000);
      expect(calc2.maxRedeemablePoints).toBe(400);
      expect(calc2.discountAmount).toBe(200);
      expect(calc2.finalTotal).toBe(800);
    });

    it("awards points on completed booking at rate of 1 pt per ₹10 spent", async () => {
      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 500,
        status: "completed",
        date: "2026-10-24",
        time: "10:00",
      });

      const initialPoints = customer.loyaltyPoints; // 100
      const earnRecord = await awardBookingCompletionPoints(booking._id);

      expect(earnRecord).toBeDefined();
      expect(earnRecord.points).toBe(50); // 500 / 10 = 50 points
      expect(earnRecord.type).toBe("earn");
      expect(earnRecord.balanceAfter).toBe(initialPoints + 50);

      const updatedCust = await User.findById(customer._id);
      expect(updatedCust.loyaltyPoints).toBe(150);

      // Idempotency test: calling awardBookingCompletionPoints second time does not double award
      const secondCall = await awardBookingCompletionPoints(booking._id);
      const afterSecondCust = await User.findById(customer._id);
      expect(afterSecondCust.loyaltyPoints).toBe(150);
    });

    it("does not award completion points if booking is not completed", async () => {
      const pendingBooking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 500,
        status: "confirmed",
        date: "2026-10-24",
        time: "10:00",
      });

      const res = await awardBookingCompletionPoints(pendingBooking._id);
      expect(res).toBeNull();
      const cust = await User.findById(customer._id);
      expect(cust.loyaltyPoints).toBe(100);
    });
  });

  describe("Sprint 3.4: Checkout Loyalty Points Redemption Integration", () => {
    it("redeems points during initiateBookingFromHold and updates amounts", async () => {
      const hold = await createHold({
        salonId: salon._id,
        customerId: customer._id,
        services: [service._id],
        date: "2026-10-24",
        time: "10:00",
        totalAmount: 1000,
      });

      const booking = await initiateBookingFromHold({
        holdId: hold._id,
        customerId: customer._id,
        useLoyaltyPoints: true,
      });

      // Customer had 100 points = ₹50 discount. Total should be 950.
      expect(booking.totalAmount).toBe(950);
      expect(booking.amounts.subtotal).toBe(1000);
      expect(booking.amounts.pointsDiscount).toBe(50);
      expect(booking.amounts.total).toBe(950);

      // Customer points should be deducted to 0
      const updatedUser = await User.findById(customer._id);
      expect(updatedUser.loyaltyPoints).toBe(0);

      // LoyaltyLedger should have a 'redeem' record
      const ledgerRecord = await LoyaltyLedger.findOne({ bookingId: booking._id, type: "redeem" });
      expect(ledgerRecord).toBeDefined();
      expect(ledgerRecord.points).toBe(100);
      expect(ledgerRecord.balanceAfter).toBe(0);
    });

    it("reverses redeemed points if pending booking is cancelled", async () => {
      const hold = await createHold({
        salonId: salon._id,
        customerId: customer._id,
        services: [service._id],
        date: "2026-10-24",
        time: "11:00",
        totalAmount: 1000,
      });

      const booking = await initiateBookingFromHold({
        holdId: hold._id,
        customerId: customer._id,
        useLoyaltyPoints: true,
      });

      expect((await User.findById(customer._id)).loyaltyPoints).toBe(0);

      // Cancel pending booking
      await cancelPendingBooking(booking._id, customer._id);

      // User points should be reversed back to 100
      const restoredUser = await User.findById(customer._id);
      expect(restoredUser.loyaltyPoints).toBe(100);

      // LoyaltyLedger should record 'reversal'
      const reversalRecord = await LoyaltyLedger.findOne({ bookingId: booking._id, type: "reversal" });
      expect(reversalRecord).toBeDefined();
      expect(reversalRecord.points).toBe(100);
      expect(reversalRecord.balanceAfter).toBe(100);
    });
  });

  describe("Sprint 3.4: Loyalty API Endpoints", () => {
    it("GET /api/v1/loyalty/balance returns balance and INR value", async () => {
      const res = await request(app)
        .get("/api/v1/loyalty/balance")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.points).toBe(100);
      expect(res.body.data.currencyValue).toBe(50);
    });

    it("GET /api/v1/loyalty/summary returns summary with ledger history", async () => {
      // Create a sample ledger entry
      await LoyaltyLedger.create({
        user: customer._id,
        type: "earn",
        points: 25,
        balanceAfter: 125,
        description: "Welcome bonus",
      });

      const res = await request(app)
        .get("/api/v1/loyalty/summary")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.loyaltyPoints).toBe(100);
      expect(res.body.data.transactions).toBeDefined();
      expect(res.body.data.transactions.length).toBeGreaterThan(0);
    });

    it("POST /api/v1/loyalty/calculate calculates allowable discount for subtotal", async () => {
      const res = await request(app)
        .post("/api/v1/loyalty/calculate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ subtotal: 800 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Max discount on 800 is 160 (320 pts), user has 100 pts -> 100 pts = ₹50 discount, final 750
      expect(res.body.data.maxRedeemablePoints).toBe(100);
      expect(res.body.data.discountAmount).toBe(50);
      expect(res.body.data.finalTotal).toBe(750);
    });
  });
});
