process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { User } from "../src/models/user.models.js";

describe("H1 & Sprint 2.1 (M1): Contextual Hero & Category Search Tests", () => {
  let replSet;
  let salonMumbai;
  let salonPune;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
    await Salon.createIndexes();
    await Service.createIndexes();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    await Salon.deleteMany({});
    await Service.deleteMany({});
    await User.deleteMany({});

    const owner = await User.create({
      username: `owner_${Date.now()}`,
      fullName: "Test Owner",
      email: `owner_${Date.now()}@example.com`,
      phonenumber: "+919876543210",
      password: "password123",
      role: "salonOwner",
    });

    // 1. Mumbai Salon with Haircut and Facial
    salonMumbai = await Salon.create({
      owner: owner._id,
      name: "Mumbai Glamour Lounge",
      address: "Bandra West",
      city: "Mumbai",
      location: {
        type: "Point",
        coordinates: [72.8258, 19.0596],
      },
      totalSeats: 3,
      isVerified: true,
      operatingHours: [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "20:00", isClosed: false },
      ],
    });

    await Service.create({
      salon: salonMumbai._id,
      name: "Classic Haircut & Styling",
      category: "Haircut",
      price: 499,
      duration: 45,
    });

    await Service.create({
      salon: salonMumbai._id,
      name: "Gold Glow Facial",
      category: "facial",
      price: 1299,
      duration: 60,
    });

    // 2. Pune Salon with Spa only
    salonPune = await Salon.create({
      owner: owner._id,
      name: "Pune Serenity Spa",
      address: "Koregaon Park",
      city: "Pune",
      location: {
        type: "Point",
        coordinates: [73.8567, 18.5204],
      },
      totalSeats: 2,
      isVerified: true,
      operatingHours: [
        { dayOfWeek: 1, openTime: "10:00", closeTime: "21:00", isClosed: false },
      ],
    });

    await Service.create({
      salon: salonPune._id,
      name: "Aromatherapy Full Body Spa",
      category: "spa",
      price: 2499,
      duration: 90,
    });
  });

  describe("GET /api/v1/salons/cities", () => {
    it("should return aggregated cities with salon counts and coordinates", async () => {
      const res = await request(app).get("/api/v1/salons/cities");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const cityNames = res.body.data.map((c) => c.name.toLowerCase());
      expect(cityNames).toContain("mumbai");
      expect(cityNames).toContain("pune");

      const mumbaiEntry = res.body.data.find((c) => c.name.toLowerCase() === "mumbai");
      expect(mumbaiEntry.salonCount).toBe(1);
      expect(mumbaiEntry.lat).toBeCloseTo(19.0596, 2);
      expect(mumbaiEntry.lng).toBeCloseTo(72.8258, 2);
    });
  });

  describe("GET /api/v1/salons?category=...", () => {
    it("should filter salons offering haircut services", async () => {
      const res = await request(app).get("/api/v1/salons?category=haircut");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const salons = res.body.data.salons || res.body.data;
      expect(salons.length).toBe(1);
      expect(salons[0].name).toBe("Mumbai Glamour Lounge");
    });

    it("should filter salons offering spa services", async () => {
      const res = await request(app).get("/api/v1/salons?category=spa");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const salons = res.body.data.salons || res.body.data;
      expect(salons.length).toBe(1);
      expect(salons[0].name).toBe("Pune Serenity Spa");
    });

    it("should filter by both city and category", async () => {
      const resMatching = await request(app).get("/api/v1/salons?city=mumbai&category=haircut");
      expect(resMatching.status).toBe(200);
      const salonsMatching = resMatching.body.data.salons || resMatching.body.data;
      expect(salonsMatching.length).toBe(1);
      expect(salonsMatching[0].name).toBe("Mumbai Glamour Lounge");

      const resNonMatching = await request(app).get("/api/v1/salons?city=pune&category=haircut");
      expect(resNonMatching.status).toBe(200);
      const salonsNonMatching = resNonMatching.body.data.salons || resNonMatching.body.data;
      expect(salonsNonMatching.length).toBe(0);
    });
  });
});
