process.env.NODE_ENV = "test";

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Salon } from "../src/models/salon.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { createHold, expireHold } from "../src/services/hold.service.js";
import { initiateBookingFromHold } from "../src/services/booking.service.js";
import { SlotCapacity } from "../src/models/slotCapacity.model.js";

import { StaffSlotLock } from "../src/models/staffSlotLock.model.js";

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
  await SlotCapacity.createIndexes();
  await StaffSlotLock.createIndexes();
});

describe("Booking Engine Unit Tests", () => {
  test("Should create a 10-minute hold and increment held count", async () => {
    const salon = await Salon.create({
      owner: new mongoose.Types.ObjectId(),
      name: "Luxury Salon",
      city: "Mumbai",
      totalSeats: 6,
    });

    const customerId = new mongoose.Types.ObjectId();
    const hold = await createHold({
      salonId: salon._id,
      customerId,
      date: "2026-08-01",
      time: "14:00",
      totalAmount: 500,
    });

    expect(hold).toBeDefined();
    expect(hold.status).toBe("active");

    const capacity = await SlotCapacity.findOne({
      salon: salon._id,
      date: "2026-08-01",
      time: "14:00",
    });

    expect(capacity).toBeDefined();
    expect(capacity.heldCount).toBe(1);
    expect(capacity.bookedCount).toBe(0);
  });

  test("Should convert active hold to pending_payment booking", async () => {
    const salon = await Salon.create({
      owner: new mongoose.Types.ObjectId(),
      name: "Luxury Salon",
      city: "Mumbai",
      totalSeats: 6,
    });

    const customerId = new mongoose.Types.ObjectId();
    const hold = await createHold({
      salonId: salon._id,
      customerId,
      date: "2026-08-01",
      time: "14:00",
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

    const updatedHold = await BookingHold.findById(hold._id);
    expect(updatedHold.status).toBe("converted");

    const capacity = await SlotCapacity.findOne({
      salon: salon._id,
      date: "2026-08-01",
      time: "14:00",
    });

    expect(capacity.heldCount).toBe(0);
    expect(capacity.bookedCount).toBe(1);
  });

  test("Should release capacity when hold expires", async () => {
    const salon = await Salon.create({
      owner: new mongoose.Types.ObjectId(),
      name: "Luxury Salon",
      city: "Mumbai",
      totalSeats: 6,
    });

    const customerId = new mongoose.Types.ObjectId();
    const hold = await createHold({
      salonId: salon._id,
      customerId,
      date: "2026-08-01",
      time: "14:00",
      totalAmount: 500,
    });

    await expireHold(hold._id);

    const updatedHold = await BookingHold.findById(hold._id);
    expect(updatedHold.status).toBe("expired");

    const capacity = await SlotCapacity.findOne({
      salon: salon._id,
      date: "2026-08-01",
      time: "14:00",
    });

    expect(capacity.heldCount).toBe(0);
    expect(capacity.bookedCount).toBe(0);
  });
});
