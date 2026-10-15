import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { checkTimeRangeAvailability } from "./availability.service.js";
import { validateOperatingHours } from "../utils/timeRange.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

/**
 * Creates a directly confirmed walk-in or phone booking created by a salon owner.
 *
 * Gap 6.3 fix: Instead of creating dummy User documents with fake emails and hardcoded
 * passwords, walk-in bookings now store guestName and guestPhone directly on the
 * Booking document. The customer field is left null for guest bookings.
 *
 * Gap 6.2 fix: paymentStatus defaults to "pending" unless paymentMethod is set to
 * "cash" or "card" (indicating the customer has already paid).
 */
export const createWalkInBooking = async ({
    salonId,
    ownerId,
    staffId,
    staffName,
    serviceIds,
    customerName,
    customerPhone,
    startTime: inputStartTime,
    source = "walk_in",
    paymentMethod = "cash", // "cash" | "card" | "unpaid"
}) => {
    const salon = await Salon.findOne({ _id: salonId, owner: ownerId });
    if (!salon) {
        throw new ApiError(403, "Forbidden - You do not own this salon");
    }

    if (!customerName || !customerPhone) {
        throw new ApiError(400, "Customer name and phone number are required for walk-in bookings");
    }

    const start = new Date(inputStartTime);
    if (isNaN(start.getTime())) {
        throw new ApiError(400, "Invalid start time provided.");
    }

    // 1. Calculate duration and total price
    const {
        services,
        serviceNames,
        totalAmount,
        durationMinutes,
        bufferMinutes,
        totalDurationWithBuffer,
    } = await calculateServicesDurationAndPrice(serviceIds, salonId);

    const end = new Date(start.getTime() + totalDurationWithBuffer * 60 * 1000);

    // 2. Validate operating hours
    validateOperatingHours(start, end, salon);

    // 3. Determine payment status based on provided payment method
    const paymentStatus = paymentMethod === "unpaid" ? "pending" : "paid";

    return await withTransactionRetry(async (session) => {
        // 4. Verify time-range availability (staff schedule + overlap queries)
        await checkTimeRangeAvailability({
            salonId,
            staffId,
            startTime: start,
            endTime: end,
            totalSeats: salon.totalSeats || 6,
            session,
        });

        // 5. Create confirmed booking record with guest fields (no dummy User document)
        const [booking] = await Booking.create(
            [
                {
                    // customer is intentionally null for walk-in guests
                    guestName: customerName,
                    guestPhone: customerPhone,
                    salon: salonId,
                    staff: staffId || undefined,
                    staffName: staffName || "Walk-in Specialist",
                    services: serviceIds,
                    serviceNames,
                    totalAmount,
                    date: start.toISOString().split("T")[0],
                    time: start.toISOString().split("T")[1].substring(0, 5),
                    startTime: start,
                    endTime: end,
                    durationMinutes,
                    bufferMinutes,
                    source,
                    status: "confirmed",
                    paymentStatus,
                },
            ],
            { session }
        );

        return booking;
    });
};
