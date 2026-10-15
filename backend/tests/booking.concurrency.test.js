process.env.NODE_ENV = "test";

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Salon } from "../src/models/salon.models.js";
import { User } from "../src/models/user.models.js";
import { Service } from "../src/models/service.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { createHold } from "../src/services/hold.service.js";

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
});

describe("Booking Engine Concurrency Tests (Overlap-Query Capacity)", () => {
  test("Exactly 6 of 30 concurrent hold requests should succeed for capacity 6", async () => {
    const owner = await User.create({
      username: `owner_${Date.now()}`,
      email: `owner_${Date.now()}@test.com`,
      fullName: "Test Owner",
      phonenumber: "9999999999",
      password: "password123",
    });

    const salon = await Salon.create({
      owner: owner._id,
      name: "High Volume Salon",
      city: "Delhi",
      totalSeats: 6,
      operatingHours: [
        { dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }, // Saturday
      ],
    });

    const service = await Service.create({
      salon: salon._id,
      name: "Quick Haircut",
      price: 300,
      duration: 30,
    });

    const totalRequests = 30;
    const startTime = new Date(Date.UTC(2026, 7, 1, 15, 0)); // 2026-08-01 15:00 (Saturday)

    // Launch 30 concurrent createHold requests in parallel
    const holdPromises = Array.from({ length: totalRequests }).map(async (_, index) => {
      try {
        const customerId = new mongoose.Types.ObjectId();
        const hold = await createHold({
          salonId: salon._id,
          customerId,
          services: [service._id],
          startTime: startTime.toISOString(),
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
    
    // Exactly 6 succeed because totalSeats = 6
    expect(successfulHolds.length).toBe(6);
    expect(failedHolds.length).toBe(24);

    // Verify database active hold count for this time range is exactly 6
    const activeHoldsCount = await BookingHold.countDocuments({
      salon: salon._id,
      status: "active",
      startTime: { $lt: new Date(startTime.getTime() + 30 * 60 * 1000) },
      endTime: { $gt: startTime },
    });

    expect(activeHoldsCount).toBe(6);
  });
});
