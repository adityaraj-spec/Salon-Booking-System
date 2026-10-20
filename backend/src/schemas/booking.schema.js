import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createHoldSchema = {
  body: z.object({
    salonId: objectIdSchema,
    staffId: objectIdSchema.optional().nullable(),
    staff: objectIdSchema.optional().nullable(),
    services: z.array(objectIdSchema).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: z.string().min(1, "Time slot is required"),
    startTime: z.string().optional(),
    staffName: z.string().optional(),
    idempotencyKey: z.string().trim().min(1).max(128).optional(),
  }).refine(
    (data) => data.services && data.services.length > 0,
    { message: "At least one service must be selected", path: ["services"] }
  ),
};

export const initiateBookingSchema = {
  body: z.object({
    holdId: objectIdSchema,
    idempotencyKey: z.string().trim().optional(),
    useLoyaltyPoints: z.boolean().optional(),
    pointsToRedeem: z.number().int().min(0).optional().nullable(),
  }),
};

export const cancelBookingSchema = {
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
};

export const updateBookingStatusSchema = {
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "rejected"]),
  }),
};
