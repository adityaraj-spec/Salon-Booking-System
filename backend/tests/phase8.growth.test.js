import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Booking } from "../src/models/booking.models.js";
import { Review } from "../src/models/review.models.js";
import { LoyaltyTransaction } from "../src/models/loyaltyTransaction.models.js";
import {
  createVerifiedReview,
  generateUserReferralCode,
  applyReferralCode,
  getUserLoyaltySummary,
} from "../src/services/growth.service.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Salon.deleteMany({});
  await Booking.deleteMany({});
  await Review.deleteMany({});
  await LoyaltyTransaction.deleteMany({});
});

describe("Phase 8 Growth Features & Verified Reviews Test Suite", () => {
  describe("Verified Reviews & Salon Rating Recalculation", () => {
    it("should submit a verified review, recalculate salon average rating, and award loyalty points", async () => {
      const customer = await User.create({
        username: "reviewcust",
        email: "reviewcust@test.com",
        fullName: "Review Customer",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "reviewowner",
        email: "reviewowner@test.com",
        fullName: "Review Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Verified Review Salon",
        city: "Mumbai",
        rating: 0,
      });

      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 1500, // should earn 15 points
        status: "completed",
        paymentStatus: "paid",
      });

      // 1. Submit verified review
      const result = await createVerifiedReview({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        rating: 5,
        comment: "Excellent service!",
      });

      expect(result.review.isVerified).toBe(true);
      expect(result.earnedPoints).toBe(15);

      // 2. Verify salon average rating updated
      const updatedSalon = await Salon.findById(salon._id);
      expect(updatedSalon.rating).toBe(5);

      // 3. Duplicate review attempt should fail with 409
      await expect(
        createVerifiedReview({
          bookingId: booking._id.toString(),
          customerId: customer._id.toString(),
          rating: 4,
          comment: "Second try",
        })
      ).rejects.toThrow(/already been submitted/);
    });
  });

  describe("Referral System & Loyalty Rewards", () => {
    it("should generate referral code, apply it for a new user, and reward both accounts with loyalty points", async () => {
      const referrer = await User.create({
        username: "referrer",
        email: "referrer@test.com",
        fullName: "Referrer User",
        phonenumber: "9876543210",
        password: "password123",
      });

      const newUser = await User.create({
        username: "newuser",
        email: "newuser@test.com",
        fullName: "New User",
        phonenumber: "9876543211",
        password: "password123",
      });

      // 1. Generate referral code
      const code = await generateUserReferralCode(referrer._id.toString());
      expect(code).toMatch(/^SN/);

      // 2. Apply referral code
      const result = await applyReferralCode({
        newUserId: newUser._id.toString(),
        referralCode: code,
      });

      expect(result.referrerBonus).toBe(50);
      expect(result.newUserBonus).toBe(25);

      // 3. Verify user point balances
      const updatedReferrer = await User.findById(referrer._id);
      const updatedNewUser = await User.findById(newUser._id);

      expect(updatedReferrer.loyaltyPoints).toBe(50);
      expect(updatedNewUser.loyaltyPoints).toBe(25);

      // 4. Verify loyalty summary
      const summary = await getUserLoyaltySummary(newUser._id.toString());
      expect(summary.loyaltyPoints).toBe(25);
      expect(summary.transactions).toHaveLength(1);
    });
  });
});
