process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test_jwt_access_secret_key_123456";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test_jwt_refresh_secret_key_123456";
process.env.INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET || "test_cron_secret_salonnow_987";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_EXPIRY = "7d";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import { Salon } from "../src/models/salon.models.js";
import { Booking } from "../src/models/booking.models.js";
import { User } from "../src/models/user.models.js";
import { runAppointmentReminders } from "../src/services/reminder.service.js";

describe("H5 Automated Appointment Reminders & Upcoming Booking Endpoint", () => {
    let replSet;
    let salon;
    let customer;
    let owner;
    let authToken;

    beforeAll(async () => {
        replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        const uri = replSet.getUri();
        await mongoose.connect(uri);
        await Booking.createIndexes();
        await Salon.createIndexes();
    }, 60000);

    afterAll(async () => {
        await mongoose.disconnect();
        if (replSet) {
            await replSet.stop();
        }
    });

    beforeEach(async () => {
        await Booking.deleteMany({});
        await Salon.deleteMany({});
        await User.deleteMany({});

        owner = await User.create({
            username: `owner_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            fullName: "Salon Owner",
            email: `owner_${Date.now()}@example.com`,
            phonenumber: "+919876543210",
            password: "Password123!",
            role: "salonOwner",
            isEmailVerified: true,
        });

        salon = await Salon.create({
            name: "Luxe Cut Salon",
            owner: owner._id,
            address: "123 Indiranagar 100ft Rd",
            city: "Bangalore",
            state: "Karnataka",
            openingHours: "09:00",
            closingHours: "21:00",
            status: "active",
            availableSeats: 3,
        });

        customer = await User.create({
            username: `cust_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            fullName: "Aarav Sharma",
            email: `aarav_${Date.now()}@example.com`,
            phonenumber: "+919988776655",
            password: "Password123!",
            role: "customer",
            isEmailVerified: true,
        });

        authToken = customer.generateAccessToken();
    });

    describe("Internal Reminders Trigger (/internal/run-reminders)", () => {
        it("rejects unauthorized calls without correct secret", async () => {
            const res = await request(app)
                .post("/api/v1/internal/run-reminders")
                .send({});
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Unauthorized");
        });

        it("authenticates via X-Internal-Secret header and processes empty queue cleanly", async () => {
            const res = await request(app)
                .post("/api/v1/internal/run-reminders")
                .set("X-Internal-Secret", "test_cron_secret_salonnow_987")
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.processed24h).toBe(0);
            expect(res.body.data.processed2h).toBe(0);
        });

        it("claims and sends 24h reminders atomically without duplicate sends", async () => {
            const now = new Date();
            const bookingStartTime24 = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now

            const booking = await Booking.create({
                customer: customer._id,
                salon: salon._id,
                startTime: bookingStartTime24,
                endTime: new Date(bookingStartTime24.getTime() + 45 * 60000),
                date: bookingStartTime24.toISOString().split("T")[0],
                time: "14:00",
                status: "confirmed",
                totalAmount: 500,
                serviceNames: ["Deluxe Haircut"],
                reminderSent: { h24: false, h2: false },
            });

            // Run first time
            const result1 = await runAppointmentReminders();
            expect(result1.processed24h).toBe(1);

            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking.reminderSent.h24).toBe(true);

            // Run second time — must be idempotent and claim 0
            const result2 = await runAppointmentReminders();
            expect(result2.processed24h).toBe(0);
        });

        it("claims and sends 2h reminders atomically without duplicate sends", async () => {
            const now = new Date();
            const bookingStartTime2 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h from now

            const booking = await Booking.create({
                customer: customer._id,
                salon: salon._id,
                startTime: bookingStartTime2,
                endTime: new Date(bookingStartTime2.getTime() + 45 * 60000),
                date: bookingStartTime2.toISOString().split("T")[0],
                time: "17:00",
                status: "confirmed",
                totalAmount: 700,
                serviceNames: ["Beard Trim"],
                reminderSent: { h24: true, h2: false },
            });

            const result = await runAppointmentReminders();
            expect(result.processed2h).toBe(1);

            const updated = await Booking.findById(booking._id);
            expect(updated.reminderSent.h2).toBe(true);

            // Run again
            const result2 = await runAppointmentReminders();
            expect(result2.processed2h).toBe(0);
        });
    });

    describe("GET /api/v1/bookings/upcoming", () => {
        it("returns null if customer has no upcoming booking within 24h", async () => {
            const res = await request(app)
                .get("/api/v1/bookings/upcoming")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeNull();
        });

        it("returns the nearest confirmed booking scheduled within the next 24 hours", async () => {
            const now = new Date();
            const bookingTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours from now

            const booking = await Booking.create({
                customer: customer._id,
                salon: salon._id,
                startTime: bookingTime,
                endTime: new Date(bookingTime.getTime() + 30 * 60000),
                date: bookingTime.toISOString().split("T")[0],
                time: "16:00",
                status: "confirmed",
                totalAmount: 400,
                serviceNames: ["Classic Shave"],
            });

            const res = await request(app)
                .get("/api/v1/bookings/upcoming")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data._id.toString()).toBe(booking._id.toString());
            expect(res.body.data.salon.name).toBe("Luxe Cut Salon");
        });

        it("does not return bookings that are cancelled or older than now", async () => {
            const now = new Date();
            const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

            await Booking.create({
                customer: customer._id,
                salon: salon._id,
                startTime: pastTime,
                endTime: new Date(pastTime.getTime() + 30 * 60000),
                date: pastTime.toISOString().split("T")[0],
                time: "10:00",
                status: "confirmed",
                totalAmount: 400,
            });

            const res = await request(app)
                .get("/api/v1/bookings/upcoming")
                .set("Authorization", `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toBeNull();
        });
    });
});
