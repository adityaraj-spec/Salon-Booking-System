import crypto from "crypto";
import mongoose from "mongoose";
import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
import { Service } from "../models/service.models.js";
import { Staff } from "../models/staff.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";
import { withQueueLock } from "../lib/redisLock.js";
import { scheduleQueueExpiry, cancelQueueExpiry } from "../queues/queueExpiry.queue.js";
import { scheduleArrivalGraceCheck, cancelArrivalGraceCheck } from "../queues/arrivalGrace.queue.js";
import { emitToUser, emitToRoom, emitToAll } from "../socket.js";
import { getZonedTimeParts } from "../utils/salonTime.js";
import { writeOutboxEvent } from "./outbox.service.js";
import {
  sendBookingConfirmationEmail,
  sendFinalReceiptEmail,
  sendServiceCompletedEmail,
  sendAppointmentCancelledEmail,
} from "../utils/mailer.js";

/**
 * Generate a 4-digit numeric verification PIN for queue check-in / start.
 */
export const generateQueuePin = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const pin = crypto.randomInt(0, 10000).toString().padStart(4, "0");
    const existing = await Booking.findOne({
      verificationPin: pin,
      status: { $in: ["requested", "accepted", "waiting", "arrived", "ready_to_start", "in_progress"] },
    }).select("_id").lean();
    if (!existing) return pin;
  }
  return crypto.randomInt(1000, 9999).toString();
};

/**
 * Validates ownership or administrative privileges for a salon.
 */
const verifySalonAccess = async (salonId, userId, role) => {
  const normalizedRole = role?.toString().trim().toLowerCase();
  if (["admin", "super_admin"].includes(normalizedRole)) {
    return true;
  }
  const salon = await Salon.findById(salonId).select("owner").lean();
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }
  if (salon.owner?.toString() !== userId?.toString()) {
    throw new ApiError(403, "You do not have permission to manage this salon's queue");
  }
  return true;
};

/**
 * Checks whether the salon is currently within its operational hours today.
 */
export const isSalonCurrentlyOpen = (salon, now = new Date()) => {
  if (!salon.isOpen) return false;
  if (!Array.isArray(salon.operatingHours) || salon.operatingHours.length === 0) {
    return true; // Unrestricted if not configured
  }

  const timezone = salon.timezone || "Asia/Kolkata";
  const { dayOfWeek, hours, minutes } = getZonedTimeParts(now, timezone);
  const currentMinutes = hours * 60 + minutes;

  const todayHours = salon.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours || todayHours.isClosed) return false;

  const [openH, openM] = (todayHours.openTime || "09:00").split(":").map(Number);
  const [closeH, closeM] = (todayHours.closeTime || "21:00").split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

/**
 * Workload-based dynamic Estimated Waiting Time (ETA) calculation engine.
 * Computes estimatedWaitMin and estimatedWaitMax for all waiting/arrived queue entries,
 * partitioning work across capable active staff members.
 *
 * @param {string|mongoose.Types.ObjectId} salonId
 * @returns {Promise<Array>} updated active queue bookings
 */
export const recalculateQueuePositionsAndETAs = async (salonId) => {
  const salon = await Salon.findById(salonId).lean();
  if (!salon) return [];

  const now = new Date();

  // 1. Fetch active staff
  const staffMembers = await Staff.find({ salon: salonId, isActive: true }).lean();

  // 2. Determine capable active staff list
  // If staff schedules are present, filter to currently on-shift staff
  const timezone = salon.timezone || "Asia/Kolkata";
  const { dayOfWeek, hours, minutes } = getZonedTimeParts(now, timezone);
  const currentMinutes = hours * 60 + minutes;

  const availableStaff = staffMembers.filter((s) => {
    if (s.isAvailable === false) return false;
    if (!Array.isArray(s.schedule) || s.schedule.length === 0) return true;

    const daySchedule = s.schedule.find((sched) => sched.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isWorking) return false;

    // Check breaks
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      const [bsH, bsM] = daySchedule.breakStart.split(":").map(Number);
      const [beH, beM] = daySchedule.breakEnd.split(":").map(Number);
      const breakStartMin = bsH * 60 + bsM;
      const breakEndMin = beH * 60 + beM;
      if (currentMinutes >= breakStartMin && currentMinutes < breakEndMin) {
        return false;
      }
    }

    // Check shift window
    const [startH, startM] = (daySchedule.startTime || "09:00").split(":").map(Number);
    const [endH, endM] = (daySchedule.endTime || "18:00").split(":").map(Number);
    const shiftStartMin = startH * 60 + startM;
    const shiftEndMin = endH * 60 + endM;

    return currentMinutes >= shiftStartMin && currentMinutes <= shiftEndMin;
  });

  // Capacity fallback: if no staff schedules match or no staff records exist,
  // allocate virtual staff lanes up to salon.maxConcurrentStaff or totalSeats or default 2
  const effectiveStaffCount = Math.max(
    1,
    availableStaff.length > 0 ? availableStaff.length : (salon.maxConcurrentStaff || 2)
  );

  // Initialize staff timeline trackers: { id, services, busyUntilMinutes }
  const staffTimelines = availableStaff.length > 0
    ? availableStaff.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        services: Array.isArray(s.services) ? s.services.map((id) => id.toString()) : [],
        skills: Array.isArray(s.skills) ? s.skills : [],
        busyUntilMinutes: 0,
      }))
    : Array.from({ length: effectiveStaffCount }, (_, i) => ({
        id: `virtual_lane_${i + 1}`,
        name: `Stylist ${i + 1}`,
        services: [], // capable of all
        skills: [],
        busyUntilMinutes: 0,
      }));

  // 3. Process in-progress bookings: calculate remaining time and assign to staff
  const inProgressBookings = await Booking.find({
    salon: salonId,
    bookingType: "queue",
    status: "in_progress",
  }).sort({ actualStartTime: 1 }).lean();

  for (const booking of inProgressBookings) {
    const elapsedMinutes = booking.actualStartTime
      ? Math.max(0, Math.floor((now.getTime() - new Date(booking.actualStartTime).getTime()) / 60000))
      : 0;
    const totalDuration = booking.durationMinutes || 30;
    const remainingMinutes = Math.max(1, totalDuration - elapsedMinutes);

    // Assign to dedicated staff member if specified
    let assigned = false;
    if (booking.staff) {
      const match = staffTimelines.find((st) => st.id === booking.staff.toString());
      if (match) {
        match.busyUntilMinutes += remainingMinutes;
        assigned = true;
      }
    }

    // Otherwise assign to staff with lowest busy time
    if (!assigned) {
      staffTimelines.sort((a, b) => a.busyUntilMinutes - b.busyUntilMinutes);
      staffTimelines[0].busyUntilMinutes += remainingMinutes;
    }
  }

  // 4. Fetch waiting and arrived queue entries ordered by queuePosition
  const queuedBookings = await Booking.find({
    salon: salonId,
    bookingType: "queue",
    status: { $in: ["waiting", "arrived", "ready_to_start"] },
  }).sort({ queuePosition: 1, requestedAt: 1 });

  const bulkOps = [];
  const updatedQueue = [];

  for (let idx = 0; idx < queuedBookings.length; idx++) {
    const booking = queuedBookings[idx];
    const monotonicPos = idx + 1; // Compact queue positions: 1, 2, 3...

    const bookingServiceIds = Array.isArray(booking.services)
      ? booking.services.map((s) => s.toString())
      : [];

    // Find capable staff
    const capableStaff = staffTimelines.filter((st) => {
      if (st.services.length === 0) return true; // General staff can do any service
      return bookingServiceIds.some((srvId) => st.services.includes(srvId));
    });

    // Select capable staff with earliest availability
    const candidates = capableStaff.length > 0 ? capableStaff : staffTimelines;
    candidates.sort((a, b) => a.busyUntilMinutes - b.busyUntilMinutes);
    const chosenStaff = candidates[0];

    const waitMin = chosenStaff.busyUntilMinutes;
    const waitMax = Math.max(waitMin + 5, Math.round(waitMin * 1.25 + 5));

    const duration = booking.durationMinutes || 30;
    const buffer = salon.bufferMin || 0;
    chosenStaff.busyUntilMinutes += duration + buffer;

    booking.queuePosition = monotonicPos;
    booking.estimatedWaitMin = waitMin;
    booking.estimatedWaitMax = waitMax;

    bulkOps.push({
      updateOne: {
        filter: { _id: booking._id },
        update: {
          $set: {
            queuePosition: monotonicPos,
            estimatedWaitMin: waitMin,
            estimatedWaitMax: waitMax,
          },
        },
      },
    });

    updatedQueue.push(booking);
  }

  if (bulkOps.length > 0) {
    await Booking.bulkWrite(bulkOps);
  }

  // Stream per-customer position updates and granular room updates
  for (const booking of updatedQueue) {
    if (booking.customer) {
      emitToUser(booking.customer.toString(), "queue:position_updated", {
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
        queuePosition: booking.queuePosition,
        estimatedWaitMin: booking.estimatedWaitMin,
        estimatedWaitMax: booking.estimatedWaitMax,
      });

      if (booking.queuePosition === 1) {
        emitToUser(booking.customer.toString(), "queue:your_turn_soon", {
          bookingId: booking._id.toString(),
          salonId: salonId.toString(),
          queuePosition: 1,
          estimatedWaitMin: booking.estimatedWaitMin,
          estimatedWaitMax: booking.estimatedWaitMax,
          message: "You're next in line! Please arrive at the salon shortly.",
        });
      }
    }

    emitToRoom(`queue:${booking._id}`, "queue:position_updated", {
      bookingId: booking._id.toString(),
      salonId: salonId.toString(),
      queuePosition: booking.queuePosition,
      estimatedWaitMin: booking.estimatedWaitMin,
      estimatedWaitMax: booking.estimatedWaitMax,
    });
  }

  // Emit socket broadcast to salon room
  emitToRoom(`salon:${salonId}`, "queue:updated", {
    salonId: salonId.toString(),
    queueLength: updatedQueue.length,
    inProgressCount: inProgressBookings.length,
    updatedAt: now.toISOString(),
  });

  return updatedQueue;
};

/**
 * Returns complete queue snapshot and statistics for a salon.
 */
export const getSalonQueue = async (salonId) => {
  const salon = await Salon.findById(salonId).select("name queueSettings isOpen operatingHours timezone totalSeats bufferMin").lean();
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }

  const queueSettings = salon.queueSettings || {
    isAccepting: true,
    isPaused: false,
    maxCapacity: 10,
    requestTimeoutMinutes: 5,
    arrivalGraceMinutes: 15,
  };

  const activeBookings = await Booking.find({
    salon: salonId,
    bookingType: "queue",
    status: { $in: ["waiting", "arrived", "ready_to_start", "in_progress"] },
  })
    .sort({ queuePosition: 1, requestedAt: 1 })
    .populate("customer", "fullName email phonenumber")
    .populate("services", "name price durationMin")
    .populate("staff", "name role")
    .lean();

  const waiting = activeBookings.filter((b) => ["waiting", "arrived", "ready_to_start"].includes(b.status));
  const inProgress = activeBookings.filter((b) => b.status === "in_progress");

  // Calculate projected wait for a newly joining customer
  let estimatedWaitRangeForNewCustomer = { min: 0, max: 15 };
  if (waiting.length > 0) {
    const lastWaiting = waiting[waiting.length - 1];
    const duration = lastWaiting.durationMinutes || 30;
    const baseMin = (lastWaiting.estimatedWaitMin || 0) + Math.floor(duration / 2);
    estimatedWaitRangeForNewCustomer = {
      min: baseMin,
      max: Math.max(baseMin + 10, Math.round(baseMin * 1.25 + 5)),
    };
  } else if (inProgress.length > 0) {
    estimatedWaitRangeForNewCustomer = { min: 10, max: 25 };
  }

  return {
    salon: {
      _id: salon._id,
      name: salon.name,
      isOpen: salon.isOpen,
      isCurrentlyOpen: isSalonCurrentlyOpen(salon),
      queueSettings,
    },
    summary: {
      waitingCount: waiting.length,
      inProgressCount: inProgress.length,
      totalActive: activeBookings.length,
      maxCapacity: queueSettings.maxCapacity,
      isAccepting: queueSettings.isAccepting && !queueSettings.isPaused,
      isPaused: queueSettings.isPaused,
      estimatedWaitRangeForNewCustomer,
    },
    queue: waiting,
    inProgress,
  };
};

/**
 * Returns incoming pending requests awaiting salon owner acceptance.
 */
export const getSalonIncomingRequests = async (salonId, ownerId, role) => {
  await verifySalonAccess(salonId, ownerId, role);

  const requests = await Booking.find({
    salon: salonId,
    bookingType: "queue",
    status: "requested",
  })
    .sort({ requestedAt: 1 })
    .populate("customer", "fullName email phonenumber")
    .populate("services", "name price durationMin")
    .populate("staff", "name role")
    .lean();

  return requests;
};

/**
 * Customer requests a position in a salon's queue.
 */
export const requestQueuePosition = async ({
  salonId,
  customerId,
  guestName,
  guestPhone,
  serviceIds,
  source = "online",
  staffId,
}) => {
  return await withQueueLock(salonId, async () => {
    const salon = await Salon.findById(salonId);
    if (!salon) {
      throw new ApiError(404, "Salon not found");
    }

    if (!salon.isOpen) {
      throw new ApiError(400, "Salon is currently closed");
    }

    const queueSettings = salon.queueSettings || {};
    if (queueSettings.isAccepting === false) {
      throw new ApiError(400, "Salon is currently not accepting new queue requests");
    }

    if (queueSettings.isPaused === true) {
      throw new ApiError(400, "Salon queue is temporarily paused. Please try again shortly.");
    }

    if (!isSalonCurrentlyOpen(salon)) {
      throw new ApiError(400, "Salon is currently outside its operating hours");
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new ApiError(400, "At least one service must be selected");
    }

    // Validate services belong to this salon
    const services = await Service.find({
      _id: { $in: serviceIds },
      salon: salonId,
    }).lean();

    if (services.length !== serviceIds.length) {
      throw new ApiError(400, "One or more selected services are invalid or inactive for this salon");
    }

    // Check maximum queue capacity
    const maxCapacity = queueSettings.maxCapacity || 10;
    const currentActiveCount = await Booking.countDocuments({
      salon: salonId,
      bookingType: "queue",
      status: { $in: ["requested", "waiting", "arrived", "ready_to_start", "in_progress"] },
    });

    if (currentActiveCount >= maxCapacity) {
      throw new ApiError(400, `Salon queue is at maximum capacity (${maxCapacity} customers). Please try again later.`);
    }

    // Calculate totals
    const totalDuration = services.reduce((sum, s) => sum + (s.durationMin || s.duration || 30), 0);
    const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);

    const snapshotServices = services.map((s) => ({
      serviceId: s._id,
      name: s.name,
      price: s.price,
      durationMin: s.durationMin || s.duration || 30,
    }));

    // Initial ETA estimate for proposal
    const currentQueue = await getSalonQueue(salonId);
    const estimatedWaitMin = currentQueue.summary.estimatedWaitRangeForNewCustomer.min;
    const estimatedWaitMax = currentQueue.summary.estimatedWaitRangeForNewCustomer.max;

    let staffDoc = null;
    if (staffId && mongoose.isValidObjectId(staffId)) {
      staffDoc = await Staff.findOne({ _id: staffId, salon: salonId, isActive: true }).select("_id name").lean();
    }

    const verificationPin = await generateQueuePin();

    const booking = await Booking.create({
      salon: salonId,
      customer: customerId || undefined,
      guestName: !customerId ? guestName : undefined,
      guestPhone: !customerId ? guestPhone : undefined,
      bookingType: "queue",
      status: "requested",
      services: serviceIds,
      serviceNames: services.map((s) => s.name),
      snapshotServices,
      staff: staffDoc?._id || undefined,
      staffName: staffDoc?.name || undefined,
      durationMinutes: totalDuration,
      totalAmount: subtotal,
      amounts: {
        subtotal,
        total: subtotal,
        convenienceFee: 0,
        pointsDiscount: 0,
      },
      requestedAt: new Date(),
      estimatedWaitMin,
      estimatedWaitMax,
      verificationPin,
      source,
    });

    // Schedule BullMQ request expiry timeout
    const timeoutMinutes = queueSettings.requestTimeoutMinutes || 5;
    const delayMs = timeoutMinutes * 60 * 1000;
    await scheduleQueueExpiry(booking._id.toString(), delayMs);

    // Socket notification to salon owner and salon room
    emitToUser(salon.owner?.toString(), "queue:request_created", {
      bookingId: booking._id.toString(),
      salonId: salonId.toString(),
      customerName: guestName || "Customer",
      services: snapshotServices,
      totalAmount: subtotal,
      durationMinutes: totalDuration,
      requestedAt: booking.requestedAt,
    });
    emitToRoom(`salon:${salonId}`, "queue:request_created", {
      bookingId: booking._id.toString(),
      salonId: salonId.toString(),
    });

    // ── Email: send booking code immediately to customer upon booking ────────
    let recipientEmail = null;
    let recipientName = guestName || "Customer";
    if (customerId) {
      const customerDoc = await User.findById(customerId).select("email fullName").lean();
      if (customerDoc?.email) {
        recipientEmail = customerDoc.email;
        recipientName = customerDoc.fullName || recipientName;
      }
    }
    if (recipientEmail) {
      sendBookingConfirmationEmail(
        recipientEmail,
        recipientName,
        salon.name || "Salon",
        booking.requestedAt.toISOString(),
        booking._id.toString(),
        snapshotServices.map((s) => s.name),
        subtotal,
        booking.requestedAt,
        verificationPin
      ).catch((err) => logger.warn({ err: err?.message }, "[QueueService] Failed to send booking creation email"));
    }

    return booking;
  });
};

/**
 * Salon owner accepts an incoming queue request.
 */
export const acceptQueueRequest = async ({ bookingId, ownerId, role }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Queue request not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    // Re-verify under lock
    const current = await Booking.findById(bookingId);
    if (!current) {
      throw new ApiError(404, "Queue request not found");
    }

    await verifySalonAccess(current.salon, ownerId, role);

    if (current.status !== "requested") {
      throw new ApiError(400, `Cannot accept request with status '${current.status}'`);
    }

    // Cancel BullMQ expiry timer
    await cancelQueueExpiry(current._id.toString());

    // Monotonic next queue position
    const maxBooking = await Booking.findOne({
      salon: current.salon,
      bookingType: "queue",
      status: { $in: ["waiting", "arrived", "ready_to_start", "in_progress"] },
    })
      .sort({ queuePosition: -1 })
      .select("queuePosition")
      .lean();

    const nextPosition = (maxBooking?.queuePosition || 0) + 1;

    current.status = "waiting";
    current.queuePosition = nextPosition;
    current.acceptedAt = new Date();
    await current.save();

    // Recalculate ETAs across the salon's queue
    await recalculateQueuePositionsAndETAs(current.salon);

    const refreshed = await Booking.findById(current._id)
      .populate("services", "name price durationMin")
      .populate("salon", "name");

    // Socket notification to customer and salon
    if (refreshed.customer) {
      emitToUser(refreshed.customer.toString(), "queue:request_accepted", {
        bookingId: refreshed._id.toString(),
        salonId: refreshed.salon._id.toString(),
        queuePosition: refreshed.queuePosition,
        estimatedWaitMin: refreshed.estimatedWaitMin,
        estimatedWaitMax: refreshed.estimatedWaitMax,
      });
    }

    emitToRoom(`salon:${refreshed.salon._id}`, "queue:request_accepted", {
      bookingId: refreshed._id.toString(),
      queuePosition: refreshed.queuePosition,
    });

    // Schedule arrival grace check
    const salonDoc = await Salon.findById(refreshed.salon._id || refreshed.salon).select("queueSettings").lean();
    const graceMinutes = salonDoc?.queueSettings?.arrivalGraceMinutes || 15;
    await scheduleArrivalGraceCheck(refreshed._id.toString(), graceMinutes);

    // ── Email: booking confirmation with queue PIN ────────────────────────────
    if (refreshed.customer?.email) {
      const serviceNames = (refreshed.snapshotServices && refreshed.snapshotServices.length > 0)
        ? refreshed.snapshotServices.map((s) => s.name || s.serviceName).filter(Boolean)
        : (refreshed.serviceNames && refreshed.serviceNames.length > 0)
          ? refreshed.serviceNames
          : ["Service"];
      sendBookingConfirmationEmail(
        refreshed.customer.email,
        refreshed.customer.fullName || refreshed.guestName || "Customer",
        refreshed.salon?.name || "Salon",
        (refreshed.startTime || refreshed.requestedAt || new Date()).toISOString(),
        refreshed._id.toString(),
        serviceNames,
        refreshed.totalAmount || 0,
        new Date(),
        refreshed.verificationPin,
      ).catch((err) => logger.warn({ err: err?.message }, "[QueueService] Failed to send acceptance email"));
    }

    return refreshed;
  });
};

/**
 * Salon owner rejects an incoming queue request.
 */
export const rejectQueueRequest = async ({ bookingId, ownerId, role, reason }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Queue request not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) {
      throw new ApiError(404, "Queue request not found");
    }

    await verifySalonAccess(current.salon, ownerId, role);

    if (current.status !== "requested") {
      throw new ApiError(400, `Cannot reject request with status '${current.status}'`);
    }

    await cancelQueueExpiry(current._id.toString());

    current.status = "rejected";
    current.rejectionReason = reason || "Salon cannot accommodate request at this time";
    await current.save();

    if (current.customer) {
      emitToUser(current.customer.toString(), "queue:request_rejected", {
        bookingId: current._id.toString(),
        salonId: current.salon.toString(),
        reason: current.rejectionReason,
      });
    }

    emitToRoom(`salon:${current.salon}`, "queue:request_rejected", {
      bookingId: current._id.toString(),
    });

    // ── Email: notify customer of rejection ──────────────────────────────────
    const customerDoc = await User.findById(current.customer).select("fullName email").lean();
    if (customerDoc?.email) {
      const salonDoc2 = await Salon.findById(current.salon).select("name").lean();
      sendAppointmentCancelledEmail(
        customerDoc.email,
        customerDoc.fullName || "Customer",
        salonDoc2?.name || "Salon",
        new Date().toISOString(),
        current._id.toString(),
        current.rejectionReason,
      ).catch((err) => logger.warn({ err: err?.message }, "[QueueService] Failed to send rejection email"));
    }

    return current;
  });
};

/**
 * Worker handler for unanswered queue requests.
 */
export const expireQueueRequest = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== "requested") {
    return null;
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current || current.status !== "requested") {
      return null;
    }

    current.status = "expired";
    await current.save();

    logger.info({ bookingId }, "[QueueService] Queue request timed out and expired");

    if (current.customer) {
      emitToUser(current.customer.toString(), "queue:request_expired", {
        bookingId: current._id.toString(),
        salonId: current.salon.toString(),
        message: "Salon did not respond within the acceptance timeout window.",
      });
    }

    emitToRoom(`salon:${current.salon}`, "queue:request_expired", {
      bookingId: current._id.toString(),
    });

    return current;
  });
};

/**
 * Customer arrives at the salon and checks in.
 */
export const checkInQueueCustomer = async ({ bookingId, customerId, ownerId, role }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) {
      throw new ApiError(404, "Booking not found");
    }

    // Verify authorized user: either the customer themselves, or salon owner/admin
    const isCustomer = customerId && current.customer?.toString() === customerId.toString();
    if (!isCustomer) {
      await verifySalonAccess(current.salon, ownerId, role);
    }

    if (!["waiting", "accepted"].includes(current.status)) {
      throw new ApiError(400, `Cannot check-in booking with status '${current.status}'`);
    }

    current.status = "arrived";
    current.arrivedAt = new Date();
    await current.save();

    await cancelArrivalGraceCheck(current._id.toString());

    emitToRoom(`salon:${current.salon}`, "queue:customer_arrived", {
      bookingId: current._id.toString(),
      salonId: current.salon.toString(),
      customerName: current.guestName || "Customer",
      queuePosition: current.queuePosition,
      arrivedAt: current.arrivedAt,
    });

    return current;
  });
};

/**
 * Salon begins service for an arrived or waiting customer.
 */
export const startQueueService = async ({ bookingId, ownerId, role, staffId, pin }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) {
      throw new ApiError(404, "Booking not found");
    }

    await verifySalonAccess(current.salon, ownerId, role);

    if (!["waiting", "arrived", "ready_to_start"].includes(current.status)) {
      throw new ApiError(400, `Cannot start service for booking with status '${current.status}'`);
    }

    // Optional verification PIN match
    if (pin && current.verificationPin && String(pin).trim() !== String(current.verificationPin).trim()) {
      throw new ApiError(400, "Invalid verification PIN");
    }

    // Assign staff if provided
    if (staffId) {
      const staffMember = await Staff.findOne({ _id: staffId, salon: current.salon, isActive: true });
      if (!staffMember) {
        throw new ApiError(400, "Specified staff member is invalid or inactive");
      }
      current.staff = staffMember._id;
      current.staffName = staffMember.name;
    }

    current.status = "in_progress";
    current.actualStartTime = new Date();
    await current.save();

    // Recalculate remaining queue positions and ETAs
    await recalculateQueuePositionsAndETAs(current.salon);

    const updated = await Booking.findById(current._id)
      .populate("customer", "fullName email phonenumber")
      .populate("staff", "name role");

    if (updated.customer) {
      emitToUser(updated.customer._id.toString(), "queue:service_started", {
        bookingId: updated._id.toString(),
        salonId: updated.salon.toString(),
        staffName: updated.staffName,
        actualStartTime: updated.actualStartTime,
      });
    }

    emitToRoom(`salon:${updated.salon}`, "queue:service_started", {
      bookingId: updated._id.toString(),
      staffId: updated.staff?._id?.toString(),
    });

    return updated;
  });
};

/**
 * Salon completes service for an in-progress customer.
 */
export const completeQueueService = async ({ bookingId, ownerId, role, paymentMethod = "cash" }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) {
      throw new ApiError(404, "Booking not found");
    }

    await verifySalonAccess(current.salon, ownerId, role);

    if (current.status !== "in_progress") {
      throw new ApiError(400, `Only in-progress bookings can be completed (current: '${current.status}')`);
    }

    current.status = "completed";
    current.actualCompletionTime = new Date();
    current.completedAt = new Date();
    current.paymentStatus = "paid";
    current.paymentMethod = paymentMethod;
    await current.save();

    // Recalculate remaining queue positions and ETAs
    await recalculateQueuePositionsAndETAs(current.salon);

    const refreshed = await Booking.findById(current._id)
      .populate("customer", "fullName email phonenumber");

    if (refreshed.customer) {
      emitToUser(refreshed.customer._id.toString(), "queue:service_completed", {
        bookingId: refreshed._id.toString(),
        salonId: refreshed.salon.toString(),
        completedAt: refreshed.completedAt,
        totalAmount: refreshed.totalAmount,
      });
    }

    emitToRoom(`salon:${refreshed.salon}`, "queue:service_completed", {
      bookingId: refreshed._id.toString(),
    });

    // ── Email: final receipt + service-completed notification ────────────────
    if (refreshed.customer?.email) {
      const salonPopulated = await Salon.findById(refreshed.salon).select("name").lean();
      const salonName = salonPopulated?.name || "Salon";
      const allServices = (refreshed.snapshotServices && refreshed.snapshotServices.length > 0)
        ? [...refreshed.snapshotServices, ...(refreshed.extraServices || [])]
        : (refreshed.serviceNames && refreshed.serviceNames.length > 0)
          ? refreshed.serviceNames.map((name) => ({ name, price: (refreshed.totalAmount || 0) / refreshed.serviceNames.length }))
          : [];

      const receiptItems = allServices.length > 0
        ? allServices.map((s) => ({
            name: s.name || s.serviceName || "Service",
            price: Number(s.price || 0),
          }))
        : [{ name: "Salon Service", price: Number(refreshed.totalAmount || 0) }];

      const serviceNamesList = receiptItems.map((s) => s.name);
      const bookingTime = refreshed.scheduledDate || refreshed.startTime || refreshed.completedAt || new Date();

      sendFinalReceiptEmail(
        refreshed.customer.email,
        refreshed.customer.fullName || "Customer",
        salonName,
        bookingTime,
        refreshed._id.toString(),
        receiptItems,
        refreshed.totalAmount || 0,
        paymentMethod,
      ).catch((err) => logger.warn({ err: err?.message }, "[QueueService] Failed to send final receipt email"));

      sendServiceCompletedEmail(
        refreshed.customer.email,
        refreshed.customer.fullName || "Customer",
        salonName,
        bookingTime,
        refreshed._id.toString(),
        serviceNamesList,
        refreshed.totalAmount || 0,
        refreshed.completedAt || new Date(),
      ).catch((err) => logger.warn({ err: err?.message }, "[QueueService] Failed to send service-completed email"));
    }

    return refreshed;
  });
};

/**
 * Salon owner reorders waiting queue entries for operational needs.
 */
export const reorderQueue = async ({ salonId, ownerId, role, bookingIds }) => {
  await verifySalonAccess(salonId, ownerId, role);

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw new ApiError(400, "bookingIds must be a non-empty array");
  }

  return await withQueueLock(salonId, async () => {
    const bulkOps = bookingIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, salon: salonId, status: { $in: ["waiting", "arrived", "ready_to_start"] } },
        update: { $set: { queuePosition: index + 1 } },
      },
    }));

    await Booking.bulkWrite(bulkOps);

    // Recalculate ETAs based on new sequence
    const updatedQueue = await recalculateQueuePositionsAndETAs(salonId);
    return updatedQueue;
  });
};

/**
 * Salon owner updates queue configuration settings.
 */
export const updateQueueSettings = async ({ salonId, ownerId, role, settings }) => {
  await verifySalonAccess(salonId, ownerId, role);

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }

  const currentSettings = salon.queueSettings || {};

  salon.queueSettings = {
    isAccepting: settings.isAccepting !== undefined ? Boolean(settings.isAccepting) : currentSettings.isAccepting ?? true,
    isPaused: settings.isPaused !== undefined ? Boolean(settings.isPaused) : currentSettings.isPaused ?? false,
    maxCapacity: Number(settings.maxCapacity) || currentSettings.maxCapacity || 10,
    requestTimeoutMinutes: Number(settings.requestTimeoutMinutes) || currentSettings.requestTimeoutMinutes || 5,
    arrivalGraceMinutes: Number(settings.arrivalGraceMinutes) || currentSettings.arrivalGraceMinutes || 15,
  };

  await salon.save();

  emitToRoom(`salon:${salonId}`, "queue:settings_updated", {
    salonId: salonId.toString(),
    queueSettings: salon.queueSettings,
  });

  return salon.queueSettings;
};


/**
 * Arrival grace period handler (called when arrival grace window expires).
 */
export const handleArrivalGraceExpiry = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;

  if (["waiting", "accepted"].includes(booking.status)) {
    logger.warn({ bookingId }, "[QueueService] Arrival grace period expired without customer check-in");

    emitToRoom(`salon:${booking.salon}`, "queue:customer_no_show_warning", {
      bookingId: booking._id.toString(),
      salonId: booking.salon.toString(),
      queuePosition: booking.queuePosition,
      customerName: booking.guestName || "Customer",
      message: "Customer has exceeded arrival grace window without checking in.",
    });

    if (booking.customer) {
      emitToUser(booking.customer.toString(), "queue:arrival_grace_expired", {
        bookingId: booking._id.toString(),
        salonId: booking.salon.toString(),
        message: "Your arrival grace window has ended. Please check in with the salon immediately.",
      });
    }
  }

  return booking;
};

/**
 * Salon proposes additional services during mid-service workflow.
 */
export const proposeExtraServices = async ({ bookingId, ownerId, role, serviceIds }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) throw new ApiError(404, "Booking not found");

    await verifySalonAccess(current.salon, ownerId, role);

    if (!["waiting", "arrived", "ready_to_start", "in_progress"].includes(current.status)) {
      throw new ApiError(400, `Cannot propose extra services for booking with status '${current.status}'`);
    }

    const services = await Service.find({
      _id: { $in: serviceIds },
      salon: current.salon,
    }).lean();

    if (services.length === 0) {
      throw new ApiError(400, "No valid services found for this salon");
    }

    const proposed = services.map((s) => ({
      serviceId: s._id,
      name: s.name,
      price: s.price,
      durationMin: s.durationMin || s.duration || 30,
    }));

    current.proposedExtraServices = proposed;
    await current.save();

    const additionalAmount = proposed.reduce((sum, s) => sum + s.price, 0);
    const additionalDuration = proposed.reduce((sum, s) => sum + s.durationMin, 0);

    if (current.customer) {
      emitToUser(current.customer.toString(), "queue:extra_services_proposed", {
        bookingId: current._id.toString(),
        salonId: current.salon.toString(),
        proposedServices: proposed,
        additionalAmount,
        additionalDuration,
        newEstimatedTotal: (current.totalAmount || 0) + additionalAmount,
      });
    }

    emitToRoom(`salon:${current.salon}`, "queue:extra_services_proposed", {
      bookingId: current._id.toString(),
      proposedServices: proposed,
      additionalAmount,
    });

    return current;
  });
};

/**
 * Customer (or authorized owner/admin) approves proposed extra services.
 */
export const approveExtraServices = async ({ bookingId, customerId, ownerId, role }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) throw new ApiError(404, "Booking not found");

    const isCustomer = customerId && current.customer?.toString() === customerId.toString();
    if (!isCustomer) {
      await verifySalonAccess(current.salon, ownerId, role);
    }

    if (!Array.isArray(current.proposedExtraServices) || current.proposedExtraServices.length === 0) {
      throw new ApiError(400, "No extra services are currently proposed for approval");
    }

    const approvedServices = [...current.proposedExtraServices];
    current.extraServices = [...(current.extraServices || []), ...approvedServices];

    const addedAmount = approvedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const addedDuration = approvedServices.reduce((sum, s) => sum + (s.durationMin || 30), 0);

    current.totalAmount = (current.totalAmount || 0) + addedAmount;
    if (current.amounts) {
      current.amounts.subtotal = (current.amounts.subtotal || 0) + addedAmount;
      current.amounts.total = (current.amounts.total || 0) + addedAmount;
    }
    current.durationMinutes = (current.durationMinutes || 30) + addedDuration;
    current.proposedExtraServices = [];

    await current.save();

    // Recalculate ETAs across the queue since duration changed
    await recalculateQueuePositionsAndETAs(current.salon);

    if (current.customer) {
      emitToUser(current.customer.toString(), "queue:extra_services_approved", {
        bookingId: current._id.toString(),
        salonId: current.salon.toString(),
        approvedServices,
        newTotal: current.totalAmount,
        newDuration: current.durationMinutes,
      });
    }

    emitToRoom(`salon:${current.salon}`, "queue:extra_services_approved", {
      bookingId: current._id.toString(),
      approvedServices,
      newTotal: current.totalAmount,
    });

    return current;
  });
};

/**
 * Customer (or owner) declines proposed extra services.
 */
export const declineExtraServices = async ({ bookingId, customerId, ownerId, role, reason }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return await withQueueLock(booking.salon.toString(), async () => {
    const current = await Booking.findById(bookingId);
    if (!current) throw new ApiError(404, "Booking not found");

    const isCustomer = customerId && current.customer?.toString() === customerId.toString();
    if (!isCustomer) {
      await verifySalonAccess(current.salon, ownerId, role);
    }

    current.proposedExtraServices = [];
    await current.save();

    if (current.customer) {
      emitToUser(current.customer.toString(), "queue:extra_services_declined", {
        bookingId: current._id.toString(),
        salonId: current.salon.toString(),
        reason: reason || "Customer declined extra services",
      });
    }

    emitToRoom(`salon:${current.salon}`, "queue:extra_services_declined", {
      bookingId: current._id.toString(),
      reason: reason || "Customer declined extra services",
    });

    return current;
  });
};

/**
 * Computes deep operational queue analytics for a salon across an optional date range.
 */
export const getQueueAnalytics = async ({ salonId, ownerId, role, from, to }) => {
  if (ownerId && role) {
    await verifySalonAccess(salonId, ownerId, role);
  }

  const salon = await Salon.findById(salonId).select("name queueSettings totalSeats timezone").lean();
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }

  const match = { salon: new mongoose.Types.ObjectId(salonId), bookingType: "queue" };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  // 1. Overall status breakdown
  const statusCounts = await Booking.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = {
    total: 0,
    requested: 0,
    waiting: 0,
    arrived: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    expired: 0,
    no_show: 0,
  };

  for (const item of statusCounts) {
    counts[item._id] = item.count;
    counts.total += item.count;
  }

  // 2. Wait-time and Duration Accuracy for Completed Bookings
  const completedMatch = {
    ...match,
    status: "completed",
    actualStartTime: { $exists: true, $ne: null },
  };

  const completedStats = await Booking.aggregate([
    { $match: completedMatch },
    {
      $project: {
        estimatedWaitMin: { $ifNull: ["$estimatedWaitMin", 0] },
        actualWaitMin: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: ["$actualStartTime", { $ifNull: ["$requestedAt", "$createdAt"] }] },
                60000,
              ],
            },
          ],
        },
        durationMinutes: { $ifNull: ["$durationMinutes", 30] },
        actualDurationMin: {
          $cond: [
            { $and: ["$actualCompletionTime", "$actualStartTime"] },
            {
              $max: [
                1,
                { $divide: [{ $subtract: ["$actualCompletionTime", "$actualStartTime"] }, 60000] },
              ],
            },
            "$durationMinutes",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgEstimatedWait: { $avg: "$estimatedWaitMin" },
        avgActualWait: { $avg: "$actualWaitMin" },
        avgExpectedDuration: { $avg: "$durationMinutes" },
        avgActualDuration: { $avg: "$actualDurationMin" },
        count: { $sum: 1 },
      },
    },
  ]);

  const waitMetrics = completedStats[0] || {
    avgEstimatedWait: 0,
    avgActualWait: 0,
    avgExpectedDuration: 0,
    avgActualDuration: 0,
    count: 0,
  };

  // 3. Abandonment metrics
  const dropouts = (counts.rejected || 0) + (counts.expired || 0) + (counts.no_show || 0);
  const abandonmentRate = counts.total > 0 ? Number(((dropouts / counts.total) * 100).toFixed(1)) : 0;
  const completionRate = counts.total > 0 ? Number(((counts.completed / counts.total) * 100).toFixed(1)) : 0;

  // 4. Daily queue trends
  const dailyTrends = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalRequests: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        dropped: {
          $sum: {
            $cond: [{ $in: ["$status", ["rejected", "expired", "no_show"]] }, 1, 0],
          },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 5. Hourly traffic distribution
  const hourlyTraffic = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $hour: { date: { $ifNull: ["$requestedAt", "$createdAt"] }, timezone: salon.timezone || "Asia/Kolkata" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const maxCapacity = salon.queueSettings?.maxCapacity || 10;
  const activeNow = (counts.waiting || 0) + (counts.arrived || 0) + (counts.in_progress || 0);
  const capacityUtilization = Number(((activeNow / maxCapacity) * 100).toFixed(1));

  return {
    salonId: salon._id,
    salonName: salon.name,
    counts,
    efficiency: {
      avgEstimatedWaitMin: Math.round(waitMetrics.avgEstimatedWait || 0),
      avgActualWaitMin: Math.round(waitMetrics.avgActualWait || 0),
      avgExpectedDurationMin: Math.round(waitMetrics.avgExpectedDuration || 0),
      avgActualDurationMin: Math.round(waitMetrics.avgActualDuration || 0),
      accuracyPercentage: waitMetrics.avgEstimatedWait > 0
        ? Math.min(100, Math.round((Math.min(waitMetrics.avgEstimatedWait, waitMetrics.avgActualWait) / Math.max(waitMetrics.avgEstimatedWait, waitMetrics.avgActualWait)) * 100))
        : 100,
    },
    abandonment: {
      dropouts,
      abandonmentRate,
      completionRate,
      breakdown: {
        rejected: counts.rejected || 0,
        expired: counts.expired || 0,
        no_show: counts.no_show || 0,
      },
    },
    liveStatus: {
      activeNow,
      maxCapacity,
      capacityUtilization,
      waiting: counts.waiting || 0,
      inProgress: counts.in_progress || 0,
    },
    dailyTrends,
    hourlyTraffic,
  };
};
