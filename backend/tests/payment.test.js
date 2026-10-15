import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { Booking } from "../src/models/booking.models.js";
import { Payment } from "../src/models/payment.models.js";
import { Refund } from "../src/models/refund.models.js";
import {
  createRazorpayOrder,
  verifyPaymentAndConfirmBooking,
  initiateRefund,
} from "../src/services/payment.service.js";
import { verifyRazorpaySignature, verifyWebhookSignature } from "../src/utils/razorpay.js";
import crypto from "crypto";

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
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await Payment.deleteMany({});
  await Refund.deleteMany({});
});

describe("Phase 3 Razorpay Payment Integration Test Suite", () => {
  describe("Razorpay Signature Verification Helpers", () => {
    it("should return true for valid checkout signature and false for invalid", () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
      const orderId = "order_9A33XWu170gUtm";
      const paymentId = "pay_29A33XWu170gUtm";
      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      expect(verifyRazorpaySignature({ orderId, paymentId, signature: validSignature })).toBe(true);
      expect(verifyRazorpaySignature({ orderId, paymentId, signature: "invalid_sig" })).toBe(false);
    });

    it("should verify webhook signature header correctly", () => {
      const secret = "my_webhook_secret";
      const payloadStr = JSON.stringify({ event: "payment.captured", id: "evt_123" });
      const validSignature = crypto
        .createHmac("sha256", secret)
        .update(payloadStr)
        .digest("hex");

      expect(verifyWebhookSignature(payloadStr, validSignature, secret)).toBe(true);
      expect(verifyWebhookSignature(payloadStr, "bad_sig", secret)).toBe(false);
    });
  });

  describe("Razorpay Order Creation & Verification Flow", () => {
    it("should create a Razorpay order, verify payment, and confirm booking atomically", async () => {
      const customer = await User.create({
        username: "paycustomer",
        email: "paycustomer@test.com",
        fullName: "Payment Customer",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "payowner",
        email: "payowner@test.com",
        fullName: "Payment Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Payment Test Salon",
        city: "Mumbai",
        totalSeats: 6,
      });

      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 1000,
        date: "2026-08-01",
        time: "14:00",
        startTime,
        endTime,
        status: "pending_payment",
        paymentStatus: "pending",
      });

      // 1. Create Order
      const order = await createRazorpayOrder({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
      });

      expect(order.orderId).toBeDefined();
      expect(order.amount).toBe(1000);

      const savedPayment = await Payment.findOne({ booking: booking._id });
      expect(savedPayment).toBeDefined();
      expect(savedPayment.status).toBe("created");

      // 2. Verify Payment & Confirm Booking
      const paymentId = "pay_test_123456";
      const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${order.orderId}|${paymentId}`)
        .digest("hex");

      const result = await verifyPaymentAndConfirmBooking({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        razorpayOrderId: order.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      expect(result.booking.status).toBe("confirmed");
      expect(result.booking.paymentStatus).toBe("paid");
      expect(result.payment.status).toBe("captured");

      // 3. Duplicate verification call should be idempotent
      const duplicateResult = await verifyPaymentAndConfirmBooking({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        razorpayOrderId: order.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      expect(duplicateResult.booking.status).toBe("confirmed");
      expect(duplicateResult.payment.status).toBe("captured");
    });
  });

  describe("Refund & Cancellation Policy", () => {
    it("should calculate 100% refund when cancelling >4 hours before appointment", async () => {
      const customer = await User.create({
        username: "refcustomer",
        email: "refcustomer@test.com",
        fullName: "Refund Customer",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "refowner",
        email: "refowner@test.com",
        fullName: "Refund Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Refund Test Salon",
        city: "Mumbai",
      });

      // Appointment in 24 hours
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 2000,
        date: "2026-08-02",
        time: "10:00",
        startTime,
        endTime,
        status: "confirmed",
        paymentStatus: "paid",
      });

      await Payment.create({
        booking: booking._id,
        customer: customer._id,
        razorpayOrderId: "order_full_refund_123",
        razorpayPaymentId: "pay_full_refund_123",
        amount: 2000,
        status: "captured",
      });

      const refundResult = await initiateRefund({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        reason: "User changed plans",
      });

      expect(refundResult.refundAmount).toBe(2000); // 100% refund
      expect(refundResult.booking.status).toBe("cancelled");
      expect(refundResult.booking.paymentStatus).toBe("refunded");
    });

    it("should calculate 50% refund when cancelling between 1 and 4 hours before appointment", async () => {
      const customer = await User.create({
        username: "halfrefcustomer",
        email: "halfrefcustomer@test.com",
        fullName: "Half Refund Customer",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "halfrefowner",
        email: "halfrefowner@test.com",
        fullName: "Half Refund Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Half Refund Salon",
        city: "Delhi",
      });

      // Appointment in 2 hours
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        totalAmount: 2000,
        date: "2026-08-01",
        time: "18:00",
        startTime,
        endTime,
        status: "confirmed",
        paymentStatus: "paid",
      });

      await Payment.create({
        booking: booking._id,
        customer: customer._id,
        razorpayOrderId: "order_half_refund_123",
        razorpayPaymentId: "pay_half_refund_123",
        amount: 2000,
        status: "captured",
      });

      const refundResult = await initiateRefund({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        reason: "Late cancellation",
      });

      expect(refundResult.refundAmount).toBe(1000); // 50% refund
      expect(refundResult.booking.status).toBe("cancelled");
      expect(refundResult.booking.paymentStatus).toBe("refunded");
    });
  });
});
