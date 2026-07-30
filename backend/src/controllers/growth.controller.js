import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createVerifiedReview,
  generateUserReferralCode,
  applyReferralCode,
  getUserLoyaltySummary,
} from "../services/growth.service.js";

export const createReviewHandler = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment, reviewText } = req.body;

  const result = await createVerifiedReview({
    bookingId,
    customerId: req.user._id,
    rating,
    comment,
    reviewText,
  });

  return res.status(201).json(
    new ApiResponse(201, result, "Verified review submitted successfully")
  );
});

export const getLoyaltySummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getUserLoyaltySummary(req.user._id);
  return res.status(200).json(new ApiResponse(200, summary, "Loyalty summary fetched successfully"));
});

export const applyReferralCodeHandler = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  const result = await applyReferralCode({
    newUserId: req.user._id,
    referralCode,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Referral code applied successfully! Bonus points credited.")
  );
});

export const getReferralCodeHandler = asyncHandler(async (req, res) => {
  const referralCode = await generateUserReferralCode(req.user._id);
  return res.status(200).json(new ApiResponse(200, { referralCode }, "Referral code generated"));
});
