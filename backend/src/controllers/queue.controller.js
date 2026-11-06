import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import * as queueService from "../services/queue.service.js";

export const getSalonQueue = asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const queueData = await queueService.getSalonQueue(salonId);
  return res.status(200).json(new ApiResponse(200, queueData, "Salon queue retrieved successfully"));
});

export const getIncomingRequests = asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const requests = await queueService.getSalonIncomingRequests(salonId, req.user._id, req.user.role);
  return res.status(200).json(new ApiResponse(200, requests, "Incoming requests retrieved successfully"));
});

export const requestQueuePosition = asyncHandler(async (req, res) => {
  const { salonId, serviceIds, guestName, guestPhone, source } = req.body;
  const customerId = req.user?._id;

  if (!salonId) {
    throw new ApiError(400, "salonId is required");
  }

  const booking = await queueService.requestQueuePosition({
    salonId,
    customerId,
    guestName,
    guestPhone,
    serviceIds,
    source,
  });

  return res.status(201).json(new ApiResponse(201, booking, "Queue position requested successfully"));
});

export const acceptQueueRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await queueService.acceptQueueRequest({
    bookingId,
    ownerId: req.user._id,
    role: req.user.role,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Queue request accepted successfully"));
});

export const rejectQueueRequest = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;
  const booking = await queueService.rejectQueueRequest({
    bookingId,
    ownerId: req.user._id,
    role: req.user.role,
    reason,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Queue request rejected successfully"));
});

export const checkInCustomer = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await queueService.checkInQueueCustomer({
    bookingId,
    customerId: req.user?._id,
    ownerId: req.user?._id,
    role: req.user?.role,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Checked in to queue successfully"));
});

export const startQueueService = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { staffId, pin } = req.body;

  const booking = await queueService.startQueueService({
    bookingId,
    ownerId: req.user._id,
    role: req.user.role,
    staffId,
    pin,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Queue service started successfully"));
});

export const completeQueueService = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { paymentMethod } = req.body;

  const booking = await queueService.completeQueueService({
    bookingId,
    ownerId: req.user._id,
    role: req.user.role,
    paymentMethod,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Queue service completed successfully"));
});

export const reorderQueue = asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const { bookingIds } = req.body;

  const queue = await queueService.reorderQueue({
    salonId,
    ownerId: req.user._id,
    role: req.user.role,
    bookingIds,
  });

  return res.status(200).json(new ApiResponse(200, queue, "Queue reordered successfully"));
});

export const updateQueueSettings = asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const settings = req.body;

  const updatedSettings = await queueService.updateQueueSettings({
    salonId,
    ownerId: req.user._id,
    role: req.user.role,
    settings,
  });

  return res.status(200).json(new ApiResponse(200, updatedSettings, "Queue settings updated successfully"));
});

export const proposeExtraServices = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { serviceIds } = req.body;

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new ApiError(400, "serviceIds must be a non-empty array");
  }

  const booking = await queueService.proposeExtraServices({
    bookingId,
    ownerId: req.user._id,
    role: req.user.role,
    serviceIds,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Extra services proposed successfully"));
});

export const approveExtraServices = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await queueService.approveExtraServices({
    bookingId,
    customerId: req.user?._id,
    ownerId: req.user?._id,
    role: req.user?.role,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Extra services approved successfully"));
});

export const declineExtraServices = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const booking = await queueService.declineExtraServices({
    bookingId,
    customerId: req.user?._id,
    ownerId: req.user?._id,
    role: req.user?.role,
    reason,
  });

  return res.status(200).json(new ApiResponse(200, booking, "Extra services declined"));
});

export const getQueueAnalytics = asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const { from, to } = req.query;

  const analytics = await queueService.getQueueAnalytics({
    salonId,
    ownerId: req.user._id,
    role: req.user.role,
    from,
    to,
  });

  return res.status(200).json(new ApiResponse(200, analytics, "Queue analytics retrieved successfully"));
});
