import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { StaffSlotLock } from "../models/staffSlotLock.model.js";
import {
  convertHoldToBookingCapacity,
  decrementHoldCapacity,
  decrementBookingCapacity,
} from "./capacity.service.js";

import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

/**
 * Initiates a booking from an active 10-minute hold.
 */
export const initiateBookingFromHold = async ({
  holdId,
  customerId,
  idempotencyKey,
}) => {
  // Idempotency check
  if (idempotencyKey) {
    const existingBooking = await Booking.findOne({ idempotencyKey, customer: customerId });
    if (existingBooking) {
      return existingBooking;
    }
  }

  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findOne({
      _id: holdId,
      customer: customerId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!hold) {
      throw new ApiError(400, "Hold has expired, been cancelled, or does not exist.");
    }

    // 1. Mark hold as converted
    hold.status = "converted";
    await hold.save({ session });

    // 2. Convert capacity from held -> booked
    await convertHoldToBookingCapacity({
      salonId: hold.salon,
      date: hold.date,
      time: hold.time,
      session,
    });

    // 3. Link staff lock to booking ID if staff was selected
    if (hold.staff) {
      await StaffSlotLock.updateOne(
        { staff: hold.staff, date: hold.date, time: hold.time },
        { $unset: { holdId: 1 } },
        { session }
      );
    }

    // 4. Create booking document with pending_payment status
    const [bookingDoc] = await Booking.create(
      [
        {
          customer: hold.customer,
          salon: hold.salon,
          staff: hold.staff,
          staffName: hold.staffName,
          services: hold.services,
          serviceNames: hold.serviceNames,
          totalAmount: hold.totalAmount,
          date: hold.date,
          time: hold.time,
          startTime: hold.startTime,
          endTime: hold.endTime,
          durationMinutes: hold.durationMinutes,
          bufferMinutes: hold.bufferMinutes,
          holdId: hold._id,
          status: "pending_payment",
          paymentStatus: "pending",
          idempotencyKey,
        },
      ],
      { session }
    );

    if (hold.staff) {
      await StaffSlotLock.updateOne(
        { staff: hold.staff, date: hold.date, time: hold.time },
        { $set: { bookingId: bookingDoc._id } },
        { session }
      );
    }

    return bookingDoc;
  });
};

/**
 * Confirms a booking after successful payment.
 */
export const confirmBookingAfterPayment = async (bookingId) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    await booking.save({ session });

    return booking;
  });
};

/**
 * Cancels a pending_payment booking and frees capacity/locks.
 */
export const cancelPendingBooking = async (bookingId, customerId) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
      status: "pending_payment",
    }).session(session);

    if (!booking) {
      throw new ApiError(404, "Pending booking not found or unauthorized");
    }

    booking.status = "cancelled";
    booking.paymentStatus = "failed";
    await booking.save({ session });

    await decrementBookingCapacity({
      salonId: booking.salon,
      staffId: booking.staff,
      date: booking.date,
      time: booking.time,
      bookingId: booking._id,
      session,
    });

    return booking;
  });
};
