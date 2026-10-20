process.env.NODE_ENV = "test";

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Salon } from "../src/models/salon.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { Service } from "../src/models/service.models.js";
import { Staff } from "../src/models/staff.models.js";
import { User } from "../src/models/user.models.js";
import { createHold, expireHold } from "../src/services/hold.service.js";
import { initiateBookingFromHold } from "../src/services/booking.service.js";
import { getAvailableSlots, getSalonCapacity } from "../src/services/availability.service.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Salon.createIndexes();
  await BookingHold.createIndexes();
  await Booking.createIndexes();
  await Staff.deleteMany({});
});

// ─── Overlap-Query Capacity Tests ─────────────────────────────────────────────
// These tests verify the NEW overlap-query based capacity system.
// SlotCapacity counters have been retired — capacity is now derived from
// counting overlapping BookingHold and Booking documents with active statuses.

describe("Booking Engine Unit Tests (Overlap-Query Capacity)", () => {
  let salon;
  let service;
  let owner;

  beforeEach(async () => {
    owner = await User.create({
      username: `owner_${Date.now()}`,
      email: `owner_${Date.now()}@test.com`,
      fullName: "Test Owner",
      phonenumber: "9999999999",
      password: "password123",
    });

    salon = await Salon.create({
      owner: owner._id,
      name: "Luxury Salon",
      city: "Mumbai",
      totalSeats: 6,
      operatingHours: [
        { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }, // Saturday
      ],
    });

    service = await Service.create({
      salon: salon._id,
      name: "Haircut",
      price: 500,
      duration: 30,
    });
  });

  test("uses a safe minimum capacity when salon capacity data is empty", () => {
    expect(getSalonCapacity({ maxConcurrentStaff: 0, totalSeats: 0, staff: [] })).toBe(5);
    expect(getSalonCapacity({})).toBe(5);
    expect(getSalonCapacity({ staff: [{ _id: "one" }, { _id: "two" }] })).toBe(2);
    expect(getSalonCapacity({ totalSeats: 7 })).toBe(7);
  });

  test("falls back to salon hours for a stylist without a custom schedule", async () => {
    const staff = await Staff.create({
      salon: salon._id,
      name: "Unscheduled Stylist",
    });

    const availability = await getAvailableSlots({
      salonId: salon._id.toString(),
      date: "2026-08-01",
      staffId: staff._id.toString(),
      durationMinutes: 30,
    });

    expect(availability.slots.length).toBeGreaterThan(0);
    expect(availability.slots.every((slot) => slot.available && slot.seatsLeft === 1)).toBe(true);
  });

  test("Should create a 10-minute hold and record it as an active BookingHold", async () => {
    const customerId = new mongoose.Types.ObjectId();
    const startTime = new Date(Date.UTC(2026, 7, 1, 14, 0)); // 2026-08-01 14:00 (Saturday)

    const hold = await createHold({
      salonId: salon._id,
      customerId,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 500,
    });

    expect(hold).toBeDefined();
    expect(hold.status).toBe("active");
    expect(hold.startTime).toEqual(startTime);

    // With overlap-only capacity: the hold document itself IS the capacity record
    const holdInDb = await BookingHold.findById(hold._id);
    expect(holdInDb.status).toBe("active");
    expect(holdInDb.salon.toString()).toBe(salon._id.toString());
  });

  test("Should convert active hold to pending_payment booking", async () => {
    const customerId = new mongoose.Types.ObjectId();
    const startTime = new Date(Date.UTC(2026, 7, 1, 15, 0)); // 2026-08-01 15:00 (Saturday)

    const hold = await createHold({
      salonId: salon._id,
      customerId,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 500,
    });

    const booking = await initiateBookingFromHold({
      holdId: hold._id,
      customerId,
      idempotencyKey: "test-idempotency-123",
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe("pending_payment");
    expect(booking.paymentStatus).toBe("pending");

    // Hold should be marked as converted
    const updatedHold = await BookingHold.findById(hold._id);
    expect(updatedHold.status).toBe("converted");

    // The booking document is now the capacity record
    const bookingInDb = await Booking.findById(booking._id);
    expect(bookingInDb.status).toBe("pending_payment");
    expect(bookingInDb.salon.toString()).toBe(salon._id.toString());
  });

  test("Should release capacity when hold expires (status → expired excludes from overlap queries)", async () => {
    const customerId = new mongoose.Types.ObjectId();
    const startTime = new Date(Date.UTC(2026, 7, 1, 16, 0)); // 2026-08-01 16:00 (Saturday)

    const hold = await createHold({
      salonId: salon._id,
      customerId,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 500,
    });

    await expireHold(hold._id);

    const updatedHold = await BookingHold.findById(hold._id);
    expect(updatedHold.status).toBe("expired");

    // With overlap-only capacity: the expired hold is excluded from future overlap queries
    // because only status="active" holds are counted. A new hold at the same time should succeed.
    const customerId2 = new mongoose.Types.ObjectId();
    const hold2 = await createHold({
      salonId: salon._id,
      customerId: customerId2,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 500,
    });
    expect(hold2.status).toBe("active");
  });
});
