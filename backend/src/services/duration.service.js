import { Service } from "../models/service.models.js";
import { Salon } from "../models/salon.models.js";
import ApiError from "../utils/apiError.js";

/**
 * Calculates total price, duration, and buffer time for a list of service IDs.
 */
export const calculateServicesDurationAndPrice = async (serviceIds = [], salonId, session = null) => {
  const salonQuery = Salon.findById(salonId).select("defaultBufferMinutes operatingHours totalSeats");
  if (session) salonQuery.session(session);

  const salon = await salonQuery;
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }

  const bufferMinutes = salon.defaultBufferMinutes || 0;

  if (!serviceIds || serviceIds.length === 0) {
    return {
      services: [],
      serviceNames: [],
      totalAmount: 0,
      durationMinutes: 30,
      bufferMinutes,
      totalDurationWithBuffer: 30 + bufferMinutes,
      salon,
    };
  }

  const query = Service.find({ _id: { $in: serviceIds }, salon: salonId });
  if (session) query.session(session);

  const services = await query;
  if (services.length !== serviceIds.length) {
    throw new ApiError(400, "One or more selected services are invalid for this salon.");
  }

  const totalAmount = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDurationMinutes = services.reduce((sum, s) => sum + (s.duration || 30), 0);

  return {
    services,
    serviceNames: services.map((s) => s.name),
    totalAmount,
    durationMinutes: totalDurationMinutes,
    bufferMinutes,
    totalDurationWithBuffer: totalDurationMinutes + bufferMinutes,
    salon,
  };
};
