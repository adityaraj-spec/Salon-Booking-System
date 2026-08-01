import { OutboxEvent } from "../models/outboxEvent.model.js";
import { invalidateAvailability } from "./availability.service.js";
import { emitToUser, emitToAll } from "../socket.js";
import logger from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// WRITE SIDE — called inside MongoDB transactions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes an OutboxEvent in the same MongoDB transaction as the state-changing
 * write. This is what makes cache invalidation durable across post-commit crashes.
 *
 * IMPORTANT: `session` is required — this write MUST be part of the same
 * transaction as the booking/hold/payment write. If session is null, the write
 * still occurs but loses the transactional atomicity guarantee.
 *
 * @param {import('mongoose').ClientSession} session - Active MongoDB session
 * @param {string} type - OutboxEvent type (see outboxEvent.model.js enum)
 * @param {object} payload - All data the relay needs (salonId, staffId, dates, etc.)
 */
export const writeOutboxEvent = async (session, type, payload) => {
  const [event] = await OutboxEvent.create(
    [{ type, payload, processed: false }],
    session ? { session } : {}
  );
  return event;
};

// ─────────────────────────────────────────────────────────────────────────────
// RELAY SIDE — called by outboxRelay.worker.js
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatches a single OutboxEvent to the correct handler, then marks it processed.
 * At-least-once semantics — safe to call multiple times (all handlers are idempotent).
 *
 * @param {import('../models/outboxEvent.model.js').OutboxEvent} event
 */
export const dispatchOutboxEvent = async (event) => {
  try {
    switch (event.type) {
      case "hold.created":
      case "hold.expired":
      case "hold.cancelled":
      case "booking.initiated":
      case "booking.confirmed":
      case "booking.cancelled":
      case "booking.rescheduled":
      case "booking.completed":
      case "booking.rejected":
        await handleAvailabilityInvalidation(event);
        await handleBookingNotification(event);
        break;

      case "staff.schedule_changed":
        await handleStaffScheduleInvalidation(event);
        break;

      case "salon.hours_changed":
        await handleSalonHoursInvalidation(event);
        break;

      default:
        logger.warn({ type: event.type, eventId: event._id }, "[OutboxRelay] Unknown event type — skipping");
    }

    // Mark processed
    await OutboxEvent.updateOne(
      { _id: event._id },
      { $set: { processed: true, processedAt: new Date() } }
    );
  } catch (err) {
    // Increment attempt counter and store error — relay will retry later
    await OutboxEvent.updateOne(
      { _id: event._id },
      {
        $inc: { attempts: 1 },
        $set: { lastError: err.message },
      }
    ).catch(() => {});
    throw err; // re-throw so the relay can back off
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalidates all availability cache keys affected by the event.
 * Uses the indexed SMEMBERS + pipelined DEL approach (no KEYS * scan).
 */
const handleAvailabilityInvalidation = async (event) => {
  const { salonId, staffId, date, oldDate, newDate } = event.payload;

  const dates = [];
  if (date) dates.push(date);
  if (oldDate) dates.push(oldDate);
  if (newDate) dates.push(newDate);

  if (salonId && dates.length > 0) {
    await invalidateAvailability({ salonId, staffId, dates });
    logger.debug(
      { type: event.type, salonId, staffId, dates },
      "[OutboxRelay] Availability cache invalidated"
    );
  }
};

/**
 * Emits real-time Socket.io notifications for booking state changes.
 */
const handleBookingNotification = async (event) => {
  const { customerId, salonId, bookingId, type } = event.payload;

  if (customerId) {
    emitToUser(customerId, "bookingUpdate", {
      bookingId,
      type: event.type.toUpperCase().replace(".", "_"),
    });
  }

  if (
    event.type === "booking.confirmed" ||
    event.type === "booking.cancelled" ||
    event.type === "booking.rejected"
  ) {
    // Owners listening to their salon's feed
    emitToAll("salonBookingUpdate", { salonId, bookingId, eventType: event.type });
  }
};

/**
 * Invalidates availability for all dates in the staff member's forward window
 * when their schedule or exceptions change (up to 60 days forward).
 */
const handleStaffScheduleInvalidation = async (event) => {
  const { salonId, staffId } = event.payload;
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  await invalidateAvailability({ salonId, staffId, dates });
  logger.debug({ salonId, staffId, days: 60 }, "[OutboxRelay] Staff schedule cache invalidated (60d window)");
};

/**
 * Invalidates availability for all staff across a bounded forward window
 * when salon operating hours change.
 */
const handleSalonHoursInvalidation = async (event) => {
  const { salonId } = event.payload;
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  // staffId: null invalidates the "any" key pattern for the salon
  await invalidateAvailability({ salonId, staffId: null, dates });
  logger.debug({ salonId, days: 60 }, "[OutboxRelay] Salon hours cache invalidated (60d window)");
};
