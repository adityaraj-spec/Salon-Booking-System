import crypto from "crypto";
import mongoose from "mongoose";
import { Review } from "../models/review.models.js";
import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
import { User } from "../models/user.models.js";
import { LoyaltyTransaction } from "../models/loyaltyTransaction.models.js";
import { invalidateSalonCache } from "../lib/cacheManager.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

import { salonRatingUpdateDurationSeconds } from "../lib/metrics.js";

/**
 * Atomically updates average rating for a salon using O(1) $inc updates on ratingSum and ratingCount.
 * Fallback to aggregation only if ratingSum / ratingCount are not yet populated.
 *
 * @param {string|object} salonId
 * @param {number} [addedRating=null] - new rating value being added (optional O(1) path)
 * @param {object} [session=null] - optional Mongoose session
 */
export const updateSalonAverageRating = async (salonId, addedRating = null, session = null) => {
  const startHr = process.hrtime.bigint();
  const salonObjectId = new mongoose.Types.ObjectId(salonId.toString());

  let newRating = 0;

  if (addedRating !== null && !isNaN(parseFloat(addedRating))) {
    // ── O(1) Atomic Incremental Path ──────────────────────────────────────
    const numericRating = parseFloat(addedRating);
    const options = session ? { session, new: true } : { new: true };

    const updatedSalon = await Salon.findByIdAndUpdate(
      salonObjectId,
      {
        $inc: {
          ratingSum: numericRating,
          ratingCount: 1,
        },
      },
      options
    );

    if (updatedSalon && updatedSalon.ratingCount > 0) {
      newRating = parseFloat((updatedSalon.ratingSum / updatedSalon.ratingCount).toFixed(1));
      const setOptions = session ? { session } : {};
      await Salon.findByIdAndUpdate(salonObjectId, { $set: { rating: newRating } }, setOptions);
    }
  } else {
    // ── Aggregation Fallback Path ──────────────────────────────────────────
    const aggregateQuery = Review.aggregate([
      { $match: { salon: salonObjectId } },
      {
        $group: {
          _id: "$salon",
          ratingSum: { $sum: "$rating" },
          ratingCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);
    if (session) aggregateQuery.session(session);

    const result = await aggregateQuery;

    if (result.length > 0) {
      const { ratingSum, ratingCount, avgRating } = result[0];
      newRating = parseFloat(avgRating.toFixed(1));
      const updateQuery = Salon.findByIdAndUpdate(
        salonObjectId,
        { $set: { ratingSum, ratingCount, rating: newRating } },
        { new: true }
      );
      if (session) updateQuery.session(session);
      await updateQuery;
    } else {
      const updateQuery = Salon.findByIdAndUpdate(
        salonObjectId,
        { $set: { ratingSum: 0, ratingCount: 0, rating: 0 } },
        { new: true }
      );
      if (session) updateQuery.session(session);
      await updateQuery;
    }
  }

  await invalidateSalonCache(salonId);

  const durationSec = Number(process.hrtime.bigint() - startHr) / 1e9;
  try { salonRatingUpdateDurationSeconds.observe(durationSec); } catch {}

  return newRating;
};

/**
 * Creates a verified post-appointment review and recalculates salon rating + awards loyalty points.
 */
export const createVerifiedReview = async ({ bookingId, customerId, rating, comment, reviewText }) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findOne({ _id: bookingId, customer: customerId }).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found or unauthorized");
    }

    if (!["completed", "confirmed"].includes(booking.status)) {
      throw new ApiError(400, "Only completed appointments can be reviewed.");
    }

    const existingReview = await Review.findOne({ booking: booking._id }).session(session);
    if (existingReview) {
      throw new ApiError(409, "A review has already been submitted for this booking.");
    }

    const textContent = comment || reviewText || "";

    const [review] = await Review.create(
      [
        {
          booking: booking._id,
          user: customerId,
          salon: booking.salon,
          rating: parseFloat(rating),
          comment: textContent,
          reviewText: textContent,
          isVerified: true,
        },
      ],
      { session }
    );

    // Recalculate average rating using O(1) incremental update
    await updateSalonAverageRating(booking.salon, parseFloat(rating), session);

    // Award loyalty points (1 point per ₹100 spent)
    const earnedPoints = Math.floor((booking.totalAmount || 0) / 100);
    if (earnedPoints > 0) {
      await User.findByIdAndUpdate(customerId, { $inc: { loyaltyPoints: earnedPoints } }, { session });
      await LoyaltyTransaction.create(
        [
          {
            user: customerId,
            booking: booking._id,
            points: earnedPoints,
            type: "earned",
            description: `Earned ${earnedPoints} points for completed booking #${booking._id}`,
          },
        ],
        { session }
      );
    }

    return { review, earnedPoints };
  });
};

/**
 * Generates or retrieves a user's unique referral code.
 */
export const generateUserReferralCode = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (user.referralCode) return user.referralCode;

  const code = `SN${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  user.referralCode = code;
  await user.save();
  return code;
};

/**
 * Applies a referral code to reward both referrer (+50 pts) and new user (+25 pts).
 */
export const applyReferralCode = async ({ newUserId, referralCode }) => {
  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (!referrer) {
    throw new ApiError(400, "Invalid referral code");
  }

  if (referrer._id.toString() === newUserId.toString()) {
    throw new ApiError(400, "Cannot use your own referral code");
  }

  const newUser = await User.findById(newUserId);
  if (!newUser) throw new ApiError(404, "User not found");

  if (newUser.referredBy) {
    throw new ApiError(400, "Referral code already applied for this account");
  }

  newUser.referredBy = referrer._id;
  newUser.loyaltyPoints += 25;
  await newUser.save();

  referrer.loyaltyPoints += 50;
  await referrer.save();

  await LoyaltyTransaction.create([
    {
      user: referrer._id,
      points: 50,
      type: "referral_bonus",
      description: `Referral bonus for inviting ${newUser.fullName}`,
    },
    {
      user: newUser._id,
      points: 25,
      type: "referral_bonus",
      description: `Welcome bonus for using referral code ${referralCode}`,
    },
  ]);

  return { referrerBonus: 50, newUserBonus: 25 };
};

/**
 * Gets user loyalty point balance and transaction history.
 */
export const getUserLoyaltySummary = async (userId) => {
  const user = await User.findById(userId).select("loyaltyPoints referralCode").lean();
  if (!user) throw new ApiError(404, "User not found");

  const transactions = await LoyaltyTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(20).lean();

  return {
    loyaltyPoints: user.loyaltyPoints || 0,
    referralCode: user.referralCode || (await generateUserReferralCode(userId)),
    transactions,
  };
};
