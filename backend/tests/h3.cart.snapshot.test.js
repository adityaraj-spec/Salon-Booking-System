process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createHold } from "../src/services/hold.service.js";
import { initiateBookingFromHold } from "../src/services/booking.service.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { User } from "../src/models/user.models.js";

describe("H3: Multi-Service Selection Cart Snapshot Tests", () => {
  let replSet;
  let salon;
  let customer;
  let service1;
  let service2;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
    await BookingHold.createIndexes();
    await Booking.createIndexes();
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

    const owner = await User.create({
      username: `owner_${Date.now()}`,
      fullName: "Salon Owner",
      email: `owner_${Date.now()}@example.com`,
      phonenumber: "+919876543211",
      password: "password123",
      role: "salonOwner",
    });

    salon = await Salon.create({
      owner: owner._id,
      name: "Elite Grooming Lounge",
      address: "123 Fashion Blvd",
      city: "Mumbai",
      totalSeats: 4,
      defaultBufferMinutes: 10,
      operatingHours: [
        { dayOfWeek: 6, openTime: "08:00", closeTime: "20:00", isClosed: false },
      ],
    });

    customer = await User.create({
      username: `customer_${Date.now()}`,
      fullName: "Arjun Verma",
      email: `arjun_${Date.now()}@example.com`,
      phonenumber: "+919876543210",
      password: "password123",
      role: "customer",
    });

    service1 = await Service.create({
      salon: salon._id,
      name: "Signature Haircut",
      category: "haircut",
      price: 500,
      durationMin: 45,
    });

    service2 = await Service.create({
      salon: salon._id,
      name: "Beard Sculpt & Spa",
      category: "shave",
      price: 350,
      durationMin: 30,
    });
  });

  test("Hold creation stores full snapshotServices array from multi-service selection", async () => {
    const snapshotServicesInput = [
      {
        serviceId: service1._id.toString(),
        name: service1.name,
        price: service1.price,
        durationMin: service1.durationMin,
      },
      {
        serviceId: service2._id.toString(),
        name: service2.name,
        price: service2.price,
        durationMin: service2.durationMin,
      },
    ];

    const hold = await createHold({
      salonId: salon._id.toString(),
      customerId: customer._id.toString(),
      services: [service1._id.toString(), service2._id.toString()],
      serviceNames: [service1.name, service2.name],
      snapshotServices: snapshotServicesInput,
      date: "2026-08-01",
      time: "10:00",
      totalAmount: 850,
    });

    expect(hold).toBeDefined();
    expect(hold.status).toBe("active");
    expect(hold.snapshotServices).toHaveLength(2);
    expect(hold.snapshotServices[0].name).toBe("Signature Haircut");
    expect(hold.snapshotServices[0].price).toBe(500);
    expect(hold.snapshotServices[0].durationMin).toBe(45);
    expect(hold.snapshotServices[1].name).toBe("Beard Sculpt & Spa");
    expect(hold.snapshotServices[1].price).toBe(350);
    expect(hold.snapshotServices[1].durationMin).toBe(30);

    // Duration should be sum of 45 + 30 = 75 minutes
    expect(hold.durationMinutes).toBe(75);
    // Buffer is 10 min -> totalDurationWithBuffer is 85 min
    expect(hold.bufferMinutes).toBe(10);
  });

  test("Initiating booking from hold preserves snapshotServices on the booking doc", async () => {
    const snapshotServicesInput = [
      {
        serviceId: service1._id.toString(),
        name: service1.name,
        price: 500,
        durationMin: 45,
      },
      {
        serviceId: service2._id.toString(),
        name: service2.name,
        price: 350,
        durationMin: 30,
      },
    ];

    const hold = await createHold({
      salonId: salon._id.toString(),
      customerId: customer._id.toString(),
      services: [service1._id.toString(), service2._id.toString()],
      serviceNames: [service1.name, service2.name],
      snapshotServices: snapshotServicesInput,
      date: "2026-08-01",
      time: "11:00",
      totalAmount: 850,
    });

    const booking = await initiateBookingFromHold({
      holdId: hold._id.toString(),
      customerId: customer._id.toString(),
    });

    expect(booking).toBeDefined();
    expect(booking.snapshotServices).toHaveLength(2);
    expect(booking.snapshotServices[0].name).toBe("Signature Haircut");
    expect(booking.snapshotServices[0].price).toBe(500);
    expect(booking.snapshotServices[0].durationMin).toBe(45);
    expect(booking.snapshotServices[1].name).toBe("Beard Sculpt & Spa");
    expect(booking.snapshotServices[1].price).toBe(350);
    expect(booking.snapshotServices[1].durationMin).toBe(30);
    expect(booking.durationMinutes).toBe(75);
  });
});
