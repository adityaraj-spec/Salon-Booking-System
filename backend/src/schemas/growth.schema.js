import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createVerifiedReviewSchema = {
  body: z.object({
    bookingId: objectIdSchema,
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    reviewText: z.string().optional(),
  }),
};

export const applyReferralCodeSchema = {
  body: z.object({
    referralCode: z.string().trim().min(3, "Referral code is required"),
  }),
};
