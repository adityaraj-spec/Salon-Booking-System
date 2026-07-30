import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createHoldSchema = {
  body: z.object({
    salonId: objectIdSchema,
    staffId: objectIdSchema.optional(),
    services: z.array(objectIdSchema).min(1, "At least one service must be selected"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: z.string().min(1, "Time slot is required"),
  }),
};

export const initiateBookingSchema = {
  body: z.object({
    holdId: objectIdSchema,
    idempotencyKey: z.string().trim().optional(),
  }),
};

export const cancelBookingSchema = {
  params: z.object({
    bookingId: objectIdSchema,
  }),
};
