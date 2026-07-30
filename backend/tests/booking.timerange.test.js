import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { Staff } from "../src/models/staff.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { createHold } from "../src/services/hold.service.js";
import { initiateBookingFromHold } from "../src/services/booking.service.js";
import { isTimeOverlapping, validateOperatingHours } from "../src/utils/timeRange.js";
import { calculateServicesDurationAndPrice } from "../src/services/duration.service.js";

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
  await Staff.deleteMany({});
  await BookingHold.deleteMany({});
  await Booking.deleteMany({});
});

describe("Phase 2 Time-Range Booking Engine Test Suite", () => {
  describe("Time Range Math & Overlap Logic", () => {
    it("should correctly identify overlapping vs non-overlapping intervals", () => {
      const start1 = new Date("2026-08-01T14:00:00.000Z");
      const end1 = new Date("2026-08-01T15:30:00.000Z");

      // Overlapping: 14:30 - 16:00
      const start2 = new Date("2026-08-01T14:30:00.000Z");
      const end2 = new Date("2026-08-01T16:00:00.000Z");
      expect(isTimeOverlapping(start1, end1, start2, end2)).toBe(true);

      // Adjacent (non-overlapping): 15:30 - 16:30
      const start3 = new Date("2026-08-01T15:30:00.000Z");
      const end3 = new Date("2026-08-01T16:30:00.000Z");
      expect(isTimeOverlapping(start1, end1, start3, end3)).toBe(false);
    });

    it("should validate operating hours correctly and reject out-of-bounds bookings", () => {
      const salon = {
        operatingHours: [
          { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }, // Saturday
        ],
      };

      // Valid range: Saturday 14:00 - 15:30 UTC
      const validStart = new Date(Date.UTC(2026, 7, 1, 14, 0));
      const validEnd = new Date(Date.UTC(2026, 7, 1, 15, 30));
      expect(() => validateOperatingHours(validStart, validEnd, salon)).not.toThrow();

      // Invalid range: Saturday 03:00 AM UTC (outside 09:00 - 21:00)
      const invalidStart = new Date(Date.UTC(2026, 7, 1, 3, 0));
      const invalidEnd = new Date(Date.UTC(2026, 7, 1, 4, 0));
      expect(() => validateOperatingHours(invalidStart, invalidEnd, salon)).toThrow(/operating hours/);
    });
  });

  describe("Duration Service", () => {
    it("should compute total duration from multiple services plus salon buffer time", async () => {
      const owner = await User.create({
        username: "owner1",
        email: "owner@test.com",
        fullName: "Owner One",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Luxury Salon",
        city: "Mumbai",
        defaultBufferMinutes: 15,
      });

      const service1 = await Service.create({
        salon: salon._id,
        name: "Haircut",
        price: 500,
        duration: 30,
      });

      const service2 = await Service.create({
        salon: salon._id,
        name: "Facial",
        price: 1200,
        duration: 60,
      });

      const result = await calculateServicesDurationAndPrice(
        [service1._id, service2._id],
        salon._id
      );

      expect(result.totalAmount).toBe(1700);
      expect(result.durationMinutes).toBe(90);
      expect(result.bufferMinutes).toBe(15);
      expect(result.totalDurationWithBuffer).toBe(105);
    });
  });

  describe("End-to-End Time-Range Booking Flow", () => {
    it("should create a time-range hold and initiate a booking with startTime, endTime, and duration", async () => {
      const customer = await User.create({
        username: "customer1",
        email: "customer@test.com",
        fullName: "Customer One",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "owner2",
        email: "owner2@test.com",
        fullName: "Owner Two",
        phonenumber: "1234567891",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Elite Salon",
        city: "Delhi",
        totalSeats: 4,
        defaultBufferMinutes: 15,
        operatingHours: [
          { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false },
        ],
      });

      const staff = await Staff.create({
        salon: salon._id,
        name: "John Stylist",
      });

      const service = await Service.create({
        salon: salon._id,
        name: "Hair Spa",
        price: 1500,
        duration: 60,
      });

      // 1. Create a hold for Saturday 14:00 UTC
      const startTime = new Date(Date.UTC(2026, 7, 1, 14, 0));
      const hold = await createHold({
        salonId: salon._id.toString(),
        customerId: customer._id.toString(),
        staffId: staff._id.toString(),
        staffName: staff.name,
        services: [service._id.toString()],
        startTime: startTime.toISOString(),
      });

      expect(hold.startTime).toEqual(startTime);
      // duration (60) + buffer (15) = 75 minutes -> 15:15
      const expectedEnd = new Date(startTime.getTime() + 75 * 60 * 1000);
      expect(hold.endTime).toEqual(expectedEnd);
      expect(hold.durationMinutes).toBe(60);
      expect(hold.bufferMinutes).toBe(15);

      // 2. Initiate booking from hold
      const booking = await initiateBookingFromHold({
        holdId: hold._id.toString(),
        customerId: customer._id.toString(),
      });

      expect(booking.status).toBe("pending_payment");
      expect(booking.startTime).toEqual(startTime);
      expect(booking.endTime).toEqual(expectedEnd);
      expect(booking.durationMinutes).toBe(60);

      // 3. Attempting an overlapping hold for the same staff member should fail (409)
      const overlappingStart = new Date(Date.UTC(2026, 7, 1, 14, 30));
      await expect(
        createHold({
          salonId: salon._id.toString(),
          customerId: customer._id.toString(),
          staffId: staff._id.toString(),
          staffName: staff.name,
          services: [service._id.toString()],
          startTime: overlappingStart.toISOString(),
        })
      ).rejects.toThrow(/already booked or reserved/);
    });
  });
});
