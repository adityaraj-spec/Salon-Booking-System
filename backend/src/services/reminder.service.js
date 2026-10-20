import { Booking } from "../models/booking.models.js";
import { Notification } from "../models/notification.models.js";
import { sendAppointmentReminderEmail } from "../utils/mailer.js";
import { emitToUser } from "../socket.js";
import logger from "../lib/logger.js";

/**
 * Runs automated appointment reminders for confirmed appointments.
 * Checks for:
 *   - 24-hour window: appointments starting in ~24 hours (22h - 26h) with reminderSent.h24 = false
 *   - 2-hour window: appointments starting in ~2 hours (0.5h - 2.5h) with reminderSent.h2 = false
 *
 * Uses atomic findOneAndUpdate claiming to guarantee no duplicate sends across workers/threads.
 */
export const runReminders = async () => {
  const now = new Date();
  const startTime24Min = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const startTime24Max = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  const startTime2Min = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now
  const startTime2Max = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours from now

  let processed24h = 0;
  let processed2h = 0;

  // ─── 1. 24-Hour Reminders ────────────────────────────────────────────────
  const candidates24h = await Booking.find({
    status: "confirmed",
    "reminderSent.h24": { $ne: true },
    startTime: { $gte: startTime24Min, $lte: startTime24Max },
  })
    .select("_id")
    .limit(100)
    .lean();

  for (const candidate of candidates24h) {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "confirmed",
        "reminderSent.h24": { $ne: true },
      },
      {
        $set: { "reminderSent.h24": true },
      },
      { returnDocument: "after" }
    )
      .populate("customer", "fullName email")
      .populate("salon", "name address owner");

    if (booking && booking.customer?.email) {
      processed24h++;
      const salonName = booking.salon?.name || "SalonNow Studio";
      const customerEmail = booking.customer.email;
      const customerName = booking.customer.fullName || "Valued Customer";
      const bookingTime = booking.startTime
        ? booking.startTime.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : `${booking.date || ""} at ${booking.time || ""}`;

      sendAppointmentReminderEmail(
        customerEmail,
        customerName,
        salonName,
        bookingTime,
        booking._id.toString(),
        booking.serviceNames || [],
        24
      ).catch((err) =>
        logger.warn({ err: err?.message, bookingId: booking._id }, "[Reminders] Failed to send 24h reminder email")
      );

      // In-app Notification
      Notification.create({
        recipient: booking.customer._id,
        sender: booking.salon?.owner || booking.customer._id,
        title: "Appointment Reminder: Tomorrow",
        message: `Your appointment at ${salonName} is scheduled for tomorrow at ${booking.time || ""}.`,
        type: "booking_confirmed",
        bookingId: booking._id,
      })
        .then((notification) => {
          emitToUser(booking.customer._id, "newNotification", notification);
        })
        .catch(() => {});
    }
  }

  // ─── 2. 2-Hour Reminders ─────────────────────────────────────────────────
  const candidates2h = await Booking.find({
    status: "confirmed",
    "reminderSent.h2": { $ne: true },
    startTime: { $gte: startTime2Min, $lte: startTime2Max },
  })
    .select("_id")
    .limit(100)
    .lean();

  for (const candidate of candidates2h) {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "confirmed",
        "reminderSent.h2": { $ne: true },
      },
      {
        $set: { "reminderSent.h2": true },
      },
      { returnDocument: "after" }
    )
      .populate("customer", "fullName email")
      .populate("salon", "name address owner");

    if (booking && booking.customer?.email) {
      processed2h++;
      const salonName = booking.salon?.name || "SalonNow Studio";
      const customerEmail = booking.customer.email;
      const customerName = booking.customer.fullName || "Valued Customer";
      const bookingTime = booking.startTime
        ? booking.startTime.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : `${booking.date || ""} at ${booking.time || ""}`;

      sendAppointmentReminderEmail(
        customerEmail,
        customerName,
        salonName,
        bookingTime,
        booking._id.toString(),
        booking.serviceNames || [],
        2
      ).catch((err) =>
        logger.warn({ err: err?.message, bookingId: booking._id }, "[Reminders] Failed to send 2h reminder email")
      );

      // In-app Notification
      Notification.create({
        recipient: booking.customer._id,
        sender: booking.salon?.owner || booking.customer._id,
        title: "Appointment Reminder: Today in ~2 Hours",
        message: `Your appointment at ${salonName} starts in approximately 2 hours (${booking.time || ""}).`,
        type: "booking_confirmed",
        bookingId: booking._id,
      })
        .then((notification) => {
          emitToUser(booking.customer._id, "newNotification", notification);
        })
        .catch(() => {});
    }
  }

  logger.info({ processed24h, processed2h }, "[Reminders] Reminder execution finished");

  return {
    success: true,
    processed24h,
    processed2h,
    timestamp: new Date().toISOString(),
  };
};

export const runAppointmentReminders = runReminders;

