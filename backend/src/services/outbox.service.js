import { OutboxEvent } from "../models/outboxEvent.model.js";
import { invalidateAvailability } from "./availability.service.js";
import { emitToUser, emitToAll } from "../socket.js";
import logger from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// WRITE SIDE — called inside MongoDB transactions
// ─────────────────────────────────────────────────────────────────────────────

export const writeOutboxEvent = async (session, type, payload) => {
  const [event] = await OutboxEvent.create(
    [{ type, payload, status: "pending", processed: false }],
    session ? { session } : {}
  );
  return event;
};

// ─────────────────────────────────────────────────────────────────────────────
// RELAY SIDE — called by outboxRelay.worker.js
// ─────────────────────────────────────────────────────────────────────────────

export const dispatchOutboxEvent = async (event) => {
  if (event.payload && event.payload.forceError) {
    throw new Error("Simulated poison event processing failure");
  }

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
};

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

const handleBookingNotification = async (event) => {
  const { customerId, salonId, bookingId } = event.payload;

  if (customerId) {
    emitToUser(customerId, "bookingUpdate", {
      bookingId,
      type: event.type.toUpperCase().replace(".", "_"),
    });
  }

  if (
    event.type === "booking.confirmed" ||
    event.type === "booking.cancelled" ||
    event.type === "booking.completed" ||
    event.type === "booking.rejected"
  ) {
    emitToAll("salonBookingUpdate", { salonId, bookingId, eventType: event.type });
  }
};

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
};

const handleSalonHoursInvalidation = async (event) => {
  const { salonId } = event.payload;
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  await invalidateAvailability({ salonId, staffId: null, dates });
};
