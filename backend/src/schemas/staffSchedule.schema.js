import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const dayScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM"),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/, "Break start must be HH:MM").optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/, "Break end must be HH:MM").optional(),
  isWorking: z.boolean().default(true),
});

export const updateStaffScheduleSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    salonId: objectIdSchema,
    schedule: z.array(dayScheduleSchema).min(1, "Schedule array must contain at least one day"),
  }),
};

export const addStaffExceptionSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    salonId: objectIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    type: z.enum(["day_off", "holiday"]).default("day_off"),
    reason: z.string().optional(),
  }),
};

export const createWalkInBookingSchema = {
  body: z.object({
    salonId: objectIdSchema,
    staffId: objectIdSchema.optional(),
    staffName: z.string().optional(),
    serviceIds: z.array(objectIdSchema).min(1, "At least one service is required"),
    customerName: z.string().min(2, "Customer name is required"),
    customerPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
    startTime: z.string().min(1, "Start time is required"),
    source: z.enum(["walk_in", "phone"]).default("walk_in"),
    paymentMethod: z.enum(["cash", "card", "unpaid"]).default("cash"),
  }),
};


export const rescheduleBookingSchema = {
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    newStartTime: z.string().min(1, "New start time is required"),
  }),
};
