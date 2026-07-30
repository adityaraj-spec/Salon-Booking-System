process.env.NODE_ENV = "test";

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Salon } from "../src/models/salon.models.js";
import { SlotCapacity } from "../src/models/slotCapacity.model.js";
import { createHold } from "../src/services/hold.service.js";

import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
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

describe("Booking Engine Concurrency Tests", () => {
  test("Exactly 6 of 30 concurrent hold requests should succeed for capacity 6", async () => {
    const salon = await Salon.create({
      owner: new mongoose.Types.ObjectId(),
      name: "High Volume Salon",
      city: "Delhi",
      totalSeats: 6,
    });

    const totalRequests = 30;
    const date = "2026-08-01";
    const time = "15:00";

    // Launch 30 concurrent createHold requests in parallel
    const holdPromises = Array.from({ length: totalRequests }).map(async (_, index) => {
      try {
        const customerId = new mongoose.Types.ObjectId();
        const hold = await createHold({
          salonId: salon._id,
          customerId,
          date,
          time,
          totalAmount: 300,
          idempotencyKey: `key-${index}`,
        });
        return { success: true, hold };
      } catch (error) {
        return { success: false, error: error.message, statusCode: error.statusCode };
      }
    });

    const results = await Promise.all(holdPromises);

    const successfulHolds = results.filter((r) => r.success);
    const failedHolds = results.filter((r) => !r.success);

    console.log(`Successful holds: ${successfulHolds.length}, Failed holds: ${failedHolds.length}`);
    if (failedHolds.length > 0) {
      console.log("Sample failure error:", failedHolds[0].error, "statusCode:", failedHolds[0].statusCode);
    }
    expect(failedHolds.length).toBe(24);

    const capacity = await SlotCapacity.findOne({
      salon: salon._id,
      date,
      time,
    });

    expect(capacity.heldCount).toBe(6);
    expect(capacity.bookedCount).toBe(0);
    expect(capacity.heldCount + capacity.bookedCount).toBeLessThanOrEqual(6);
  });
});
