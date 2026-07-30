import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createOrderSchema = {
  body: z.object({
    bookingId: objectIdSchema,
  }),
};

export const verifyPaymentSchema = {
  body: z.object({
    bookingId: objectIdSchema,
    razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
    razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
    razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
  }),
};

export const refundBookingSchema = {
  body: z.object({
    bookingId: objectIdSchema,
    reason: z.string().optional(),
  }),
};
