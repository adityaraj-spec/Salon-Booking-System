import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Booking } from "../models/booking.models.js";
import { LoyaltyLedger } from "../models/loyaltyLedger.model.js";
import { LoyaltyTransaction } from "../models/loyaltyTransaction.models.js";
import logger from "../lib/logger.js";
import ApiError from "../utils/apiError.js";

export const POINT_VALUE_INR = 0.50; // 1 loyalty point = ₹0.50
export const MAX_REDEMPTION_RATIO = 0.20; // Capped at 20% of subtotal
export const EARN_RATE_SPENT_INR = 10; // 1 point per ₹10 spent

/**
 * Calculates allowable loyalty redemption based on user balance and subtotal.
 * Rate: 1 point = ₹0.50, capped at 20% of subtotal.
 */
export const calculateLoyaltyDiscount = (userPoints = 0, subtotal = 0, requestedPoints = null) => {
  const numericSubtotal = Math.max(0, Number(subtotal) || 0);
  const availablePoints = Math.max(0, Math.floor(Number(userPoints) || 0));

  const maxDiscountInr = numericSubtotal * MAX_REDEMPTION_RATIO;
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(maxDiscountInr / POINT_VALUE_INR)
  );

  let pointsToRedeem = maxRedeemablePoints;
  if (requestedPoints !== null && requestedPoints !== undefined) {
    const requested = Math.max(0, Math.floor(Number(requestedPoints) || 0));
    pointsToRedeem = Math.min(requested, maxRedeemablePoints);
  }

  const discountAmount = parseFloat((pointsToRedeem * POINT_VALUE_INR).toFixed(2));
  const finalTotal = parseFloat(Math.max(0, numericSubtotal - discountAmount).toFixed(2));

  return {
    availablePoints,
    maxRedeemablePoints,
    pointsToRedeem,
    discountAmount,
    finalTotal,
    pointValueInr: POINT_VALUE_INR,
    maxDiscountInr,
  };
};

/**
 * Redeems loyalty points for a booking during initiation.
 * Decrements user's points and writes a 'redeem' record to LoyaltyLedger.
 */
export const redeemPointsForBooking = async ({ userId, bookingId, pointsToRedeem, session = null }) => {
  const points = Math.floor(Number(pointsToRedeem) || 0);
  if (points <= 0) return { pointsRedeemed: 0, discountAmount: 0 };

  const query = User.findById(userId);
  if (session) query.session(session);
  const user = await query;

  if (!user) {
    throw new ApiError(404, "User not found for loyalty redemption");
  }

  if ((user.loyaltyPoints || 0) < points) {
    throw new ApiError(400, `Insufficient loyalty points. Balance: ${user.loyaltyPoints || 0}, Requested: ${points}`);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: -points } },
    { new: true, session: session || undefined }
  );

  const balanceAfter = updatedUser.loyaltyPoints;
  const description = `Redeemed ${points} points for booking #${bookingId}`;

  const ledgerDoc = [
    {
      user: userId,
      bookingId,
      type: "redeem",
      points,
      balanceAfter,
      description,
    },
  ];

  if (session) {
    await LoyaltyLedger.create(ledgerDoc, { session });
    await LoyaltyTransaction.create(
      [
        {
          user: userId,
          booking: bookingId,
          points: -points,
          type: "redeemed",
          description,
        },
      ],
      { session }
    );
  } else {
    await LoyaltyLedger.create(ledgerDoc);
    await LoyaltyTransaction.create([
      {
        user: userId,
        booking: bookingId,
        points: -points,
        type: "redeemed",
        description,
      },
    ]);
  }

  logger.info({ userId, bookingId, points, balanceAfter }, "[Loyalty] Redeemed points for booking");

  return {
    pointsRedeemed: points,
    discountAmount: parseFloat((points * POINT_VALUE_INR).toFixed(2)),
    balanceAfter,
  };
};

/**
 * Reverses previously redeemed loyalty points when a booking is cancelled or rejected.
 */
export const reversePointsForBooking = async ({ userId, bookingId, session = null }) => {
  if (!bookingId) return;

  const findQuery = LoyaltyLedger.findOne({ bookingId, type: "redeem" });
  if (session) findQuery.session(session);
  const existingRedeem = await findQuery;

  if (!existingRedeem) return; // No points were redeemed for this booking

  // Check if already reversed
  const revQuery = LoyaltyLedger.findOne({ bookingId, type: "reversal" });
  if (session) revQuery.session(session);
  const alreadyReversed = await revQuery;
  if (alreadyReversed) return;

  const pointsToReturn = existingRedeem.points;
  const updatedUser = await User.findByIdAndUpdate(
    userId || existingRedeem.user,
    { $inc: { loyaltyPoints: pointsToReturn } },
    { new: true, session: session || undefined }
  );

  const balanceAfter = updatedUser ? updatedUser.loyaltyPoints : 0;
  const description = `Reversed ${pointsToReturn} loyalty points for cancelled booking #${bookingId}`;

  const ledgerDoc = [
    {
      user: userId || existingRedeem.user,
      bookingId,
      type: "reversal",
      points: pointsToReturn,
      balanceAfter,
      description,
    },
  ];

  if (session) {
    await LoyaltyLedger.create(ledgerDoc, { session });
  } else {
    await LoyaltyLedger.create(ledgerDoc);
  }

  logger.info({ bookingId, pointsReturned: pointsToReturn, balanceAfter }, "[Loyalty] Points reversed for booking");
};

/**
 * Awards loyalty points upon booking completion (1 point per ₹10 spent).
 * Idempotent: Skips if points for this bookingId have already been awarded.
 */
export const awardBookingCompletionPoints = async (bookingId, session = null) => {
  const bQuery = Booking.findById(bookingId);
  if (session) bQuery.session(session);
  const booking = await bQuery;

  if (!booking || !booking.customer) return null;
  if (booking.status !== "completed") return null;

  // Idempotency check: don't award twice for the same booking
  const existingEarnQuery = LoyaltyLedger.findOne({ bookingId: booking._id, type: "earn" });
  if (session) existingEarnQuery.session(session);
  const existingEarn = await existingEarnQuery;
  if (existingEarn) {
    logger.info({ bookingId: booking._id }, "[Loyalty] Points already awarded for completed booking");
    return existingEarn;
  }

  // 1 point per ₹10 spent
  const totalSpent = booking.totalAmount || booking.amounts?.total || 0;
  const earnedPoints = Math.floor(totalSpent / EARN_RATE_SPENT_INR);

  if (earnedPoints <= 0) return null;

  const updatedUser = await User.findByIdAndUpdate(
    booking.customer,
    { $inc: { loyaltyPoints: earnedPoints } },
    { new: true, session: session || undefined }
  );

  const balanceAfter = updatedUser ? updatedUser.loyaltyPoints : earnedPoints;
  const description = `Earned ${earnedPoints} points for completed booking #${booking._id}`;

  const ledgerDoc = [
    {
      user: booking.customer,
      bookingId: booking._id,
      type: "earn",
      points: earnedPoints,
      balanceAfter,
      description,
    },
  ];

  let result;
  if (session) {
    [result] = await LoyaltyLedger.create(ledgerDoc, { session });
    await LoyaltyTransaction.create(
      [
        {
          user: booking.customer,
          booking: booking._id,
          points: earnedPoints,
          type: "earned",
          description,
        },
      ],
      { session }
    );
  } else {
    [result] = await LoyaltyLedger.create(ledgerDoc);
    await LoyaltyTransaction.create([
      {
        user: booking.customer,
        booking: booking._id,
        points: earnedPoints,
        type: "earned",
        description,
      },
    ]);
  }

  logger.info({ bookingId: booking._id, earnedPoints, balanceAfter }, "[Loyalty] Points awarded for booking completion");
  return result;
};

/**
 * Gets loyalty overview, current balance, INR equivalent, and recent ledger entries.
 */
export const getLoyaltyLedgerSummary = async (userId) => {
  const user = await User.findById(userId).select("loyaltyPoints referralCode fullName email").lean();
  if (!user) throw new ApiError(404, "User not found");

  const ledgerHistory = await LoyaltyLedger.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const balance = user.loyaltyPoints || 0;

  return {
    loyaltyPoints: balance,
    points: balance,
    pointValueInr: POINT_VALUE_INR,
    currencyValue: parseFloat((balance * POINT_VALUE_INR).toFixed(2)),
    referralCode: user.referralCode || "",
    transactions: ledgerHistory.map((item) => ({
      _id: item._id,
      type: item.type,
      points: item.points,
      balanceAfter: item.balanceAfter,
      description: item.description,
      bookingId: item.bookingId,
      createdAt: item.createdAt,
    })),
  };
};
