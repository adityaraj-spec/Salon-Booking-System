import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Staff } from "../src/models/staff.models.js";
import { Service } from "../src/models/service.models.js";
import { Booking } from "../src/models/booking.models.js";
import {
  updateStaffSchedule,
  addStaffException,
  getStaffAvailabilityOnDate,
} from "../src/services/staff.service.js";
import { createWalkInBooking } from "../src/services/walkin.service.js";
import { rescheduleBooking } from "../src/services/reschedule.service.js";

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
  await Staff.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
});

describe("Phase 6 Staff Management & Scheduling Test Suite", () => {
  describe("Staff Schedule & Exception Management", () => {
    it("should update weekly schedule and handle day off exceptions", async () => {
      const owner = await User.create({
        username: "staffowner",
        email: "staffowner@test.com",
        fullName: "Staff Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Staff Test Salon",
        city: "Mumbai",
      });

      const staff = await Staff.create({
        salon: salon._id,
        name: "Alex Stylist",
        role: "Senior Hairdresser",
      });

      // 1. Update weekly schedule (Monday - Friday 09:00 - 18:00)
      const weeklySchedule = [
        { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isWorking: true },
        { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isWorking: true },
        { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isWorking: true },
      ];

      const updated = await updateStaffSchedule({
        staffId: staff._id.toString(),
        salonId: salon._id.toString(),
        schedule: weeklySchedule,
      });

      expect(updated.schedule).toHaveLength(3);

      // 2. Add day off exception for 2026-08-03
      await addStaffException({
        staffId: staff._id.toString(),
        salonId: salon._id.toString(),
        date: "2026-08-03",
        type: "day_off",
        reason: "Personal leave",
      });

      // 3. Verify availability query on exception date
      const avail = await getStaffAvailabilityOnDate(staff._id.toString(), "2026-08-03");
      expect(avail.isWorking).toBe(false);
      expect(avail.reason).toContain("Personal leave");
    });
  });

  describe("Walk-In Booking Creation", () => {
    it("should create a directly confirmed walk-in booking for a salon owner", async () => {
      const owner = await User.create({
        username: "walkinowner",
        email: "walkinowner@test.com",
        fullName: "Walkin Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Walkin Salon",
        city: "Delhi",
        operatingHours: [
          { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false },
        ],
      });

      const service = await Service.create({
        salon: salon._id,
        name: "Quick Trim",
        price: 300,
        duration: 30,
      });

      const startTime = new Date(Date.UTC(2026, 7, 1, 14, 0));

      const booking = await createWalkInBooking({
        salonId: salon._id.toString(),
        ownerId: owner._id.toString(),
        serviceIds: [service._id.toString()],
        customerName: "Walkin Client",
        customerPhone: "+919988776655",
        startTime: startTime.toISOString(),
        source: "walk_in",
      });

      expect(booking.status).toBe("confirmed");
      expect(booking.paymentStatus).toBe("paid");
      expect(booking.source).toBe("walk_in");
      expect(booking.totalAmount).toBe(300);
    });
  });

  describe("Atomic Rescheduling Flow", () => {
    it("should reschedule an existing booking to a new time range atomically", async () => {
      const customer = await User.create({
        username: "reschedcust",
        email: "reschedcust@test.com",
        fullName: "Reschedule Customer",
        phonenumber: "9876543210",
        password: "password123",
      });

      const owner = await User.create({
        username: "reschedowner",
        email: "reschedowner@test.com",
        fullName: "Reschedule Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      const salon = await Salon.create({
        owner: owner._id,
        name: "Reschedule Salon",
        city: "Mumbai",
        operatingHours: [
          { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false },
        ],
      });

      const service = await Service.create({
        salon: salon._id,
        name: "Styling",
        price: 800,
        duration: 60,
      });

      const initialStart = new Date(Date.UTC(2026, 7, 1, 10, 0));
      const initialEnd = new Date(initialStart.getTime() + 60 * 60 * 1000);

      const booking = await Booking.create({
        customer: customer._id,
        salon: salon._id,
        services: [service._id],
        totalAmount: 800,
        date: "2026-08-01",
        time: "10:00",
        startTime: initialStart,
        endTime: initialEnd,
        status: "confirmed",
        paymentStatus: "paid",
      });

      // Reschedule to 15:00 UTC
      const newStart = new Date(Date.UTC(2026, 7, 1, 15, 0));
      const rescheduled = await rescheduleBooking({
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        newStartTime: newStart.toISOString(),
      });

      expect(rescheduled.startTime).toEqual(newStart);
      expect(rescheduled.rescheduledFrom.toString()).toBe(booking._id.toString());
      expect(rescheduled.status).toBe("confirmed");
    });
  });
});
