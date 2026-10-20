import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createHoldSchema = {
  body: z.object({
    salonId: objectIdSchema,
    staffId: objectIdSchema.optional().nullable(),
    staff: objectIdSchema.optional().nullable(),
    services: z.array(objectIdSchema).optional(),
    serviceNames: z.array(z.string()).optional(),
    snapshotServices: z.array(
      z.object({
        serviceId: objectIdSchema.optional(),
        _id: objectIdSchema.optional(),
        name: z.string().optional(),
        price: z.number().optional(),
        durationMin: z.number().optional(),
        duration: z.number().optional(),
      }).passthrough()
    ).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: z.string().min(1, "Time slot is required"),
    startTime: z.string().optional(),
    totalAmount: z.number().optional(),
    staffName: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }).passthrough().refine(
    (data) => (data.services && data.services.length > 0) || (data.snapshotServices && data.snapshotServices.length > 0),
    { message: "At least one service must be selected", path: ["services"] }
  ),
};

export const initiateBookingSchema = {
  body: z.object({
    holdId: objectIdSchema,
    idempotencyKey: z.string().trim().optional(),
    useLoyaltyPoints: z.boolean().optional(),
    pointsToRedeem: z.number().optional().nullable(),
  }).passthrough(),
};

export const cancelBookingSchema = {
  params: z.object({
    bookingId: objectIdSchema,
  }),
};
