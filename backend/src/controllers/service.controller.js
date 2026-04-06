import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Service } from "../models/service.models.js";
import { Salon } from "../models/salon.models.js";

const addService = asyncHandler(async (req, res) => {
    const { salonId, name, category, price, duration, description } = req.body;

    if (!salonId || !name || !price || !duration) {
        throw new ApiError(400, "Salon ID, name, price, and duration are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Security: Only owner can add services
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to add services to this salon");
    }

    const service = await Service.create({
        salon: salonId,
        name,
        category,
        price,
        duration,
        description
    });

    return res.status(201).json(
        new ApiResponse(201, service, "Service added successfully")
    );
});

const getSalonServices = asyncHandler(async (req, res) => {
    const { salonId } = req.params;

    if (!salonId) {
        throw new ApiError(400, "Salon ID is required");
    }

    const services = await Service.find({ salon: salonId }).sort({ category: 1, name: 1 });

    return res.status(200).json(
        new ApiResponse(200, services, "Services fetched successfully")
    );
});

const deleteService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
        throw new ApiError(404, "Service not found");
    }

    const salon = await Salon.findById(service.salon);
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this service");
    }

    await Service.findByIdAndDelete(serviceId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Service deleted successfully")
    );
});

export { addService, getSalonServices, deleteService };
