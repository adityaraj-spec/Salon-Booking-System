import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createRazorpayOrder,
  verifyPaymentAndConfirmBooking,
  processRazorpayWebhook,
  initiateRefund,
} from "../services/payment.service.js";

export const createOrderHandler = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const orderData = await createRazorpayOrder({
    bookingId,
    customerId: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, orderData, "Razorpay payment order created successfully")
  );
});

export const verifyPaymentHandler = asyncHandler(async (req, res) => {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const result = await verifyPaymentAndConfirmBooking({
    bookingId,
    customerId: req.user._id,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Payment verified and booking confirmed successfully")
  );
});

export const webhookHandler = asyncHandler(async (req, res) => {
  const signatureHeader = req.headers["x-razorpay-signature"];
  const rawBody = req.body;

  const result = await processRazorpayWebhook({
    rawBody,
    signatureHeader,
    eventPayload: req.body,
  });

  return res.status(200).json(new ApiResponse(200, result, "Webhook processed"));
});

export const refundHandler = asyncHandler(async (req, res) => {
  const { bookingId, reason } = req.body;

  const result = await initiateRefund({
    bookingId,
    customerId: req.user._id,
    reason,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Booking cancelled and refund processed successfully")
  );
});
