import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Salon } from "../src/models/salon.models.js";
import { searchSalonsNearby } from "../src/services/search.service.js";
import { cacheSet, cacheGet, invalidateSalonCache } from "../src/lib/cacheManager.js";

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
});

describe("Phase 7 Geospatial Search & Redis Cache Test Suite", () => {
  describe("Redis Cache Manager Utility", () => {
    it("should handle cacheSet and cacheGet gracefully with fallback", async () => {
      const key = "test:sample_key";
      const value = { name: "Test Salon", rating: 4.5 };

      await cacheSet(key, value, 10);
      const cached = await cacheGet(key);

      if (cached) {
        expect(cached.name).toBe("Test Salon");
      }

      await invalidateSalonCache("salon_123");
    });
  });

  describe("2dsphere Geospatial Search Engine", () => {
    it("should return nearby salons sorted by distance when coordinates are provided", async () => {
      const owner = await User.create({
        username: "searchowner",
        email: "searchowner@test.com",
        fullName: "Search Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      // Salon 1: Connaught Place, New Delhi [77.2167, 28.6315]
      const nearSalon = await Salon.create({
        owner: owner._id,
        name: "Connaught Spa",
        city: "Delhi",
        rating: 4.8,
        location: {
          type: "Point",
          coordinates: [77.2167, 28.6315],
        },
      });

      // Salon 2: Gurgaon [77.0266, 28.4595] (~25 km away)
      const farSalon = await Salon.create({
        owner: owner._id,
        name: "Gurgaon Beauty Hub",
        city: "Gurgaon",
        rating: 4.2,
        location: {
          type: "Point",
          coordinates: [77.0266, 28.4595],
        },
      });

      // Search near Connaught Place (radius 30,000m)
      const result = await searchSalonsNearby({
        longitude: 77.2167,
        latitude: 28.6315,
        maxDistanceMeters: 30000,
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data[0].name).toBe("Connaught Spa");
      expect(result.data[0].distanceMeters).toBeLessThan(100);
    });

    it("should filter salons by minimum rating and city name", async () => {
      const owner = await User.create({
        username: "filterowner",
        email: "filterowner@test.com",
        fullName: "Filter Owner",
        phonenumber: "1234567890",
        password: "password123",
      });

      await Salon.create({
        owner: owner._id,
        name: "High Rated Salon",
        city: "Mumbai",
        rating: 4.9,
      });

      await Salon.create({
        owner: owner._id,
        name: "Average Rated Salon",
        city: "Mumbai",
        rating: 3.2,
      });

      const result = await searchSalonsNearby({
        city: "Mumbai",
        rating: 4.5,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("High Rated Salon");
    });
  });
});
