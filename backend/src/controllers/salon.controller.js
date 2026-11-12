import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { Salon } from "../models/salon.models.js"
import { User } from "../models/user.models.js"
import { Booking } from "../models/booking.models.js"
import { Service } from "../models/service.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ROLES } from "../constants.js"
import { sendShopAddedEmail } from "../utils/mailer.js"
import { emitToAll } from "../socket.js";
import { geocodeAddress } from "../utils/geocoding.js";

// Helper: escape special regex characters in user input to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const filesFor = (req, field) => Array.isArray(req.files)
    ? (field === "images" ? req.files : [])
    : (req.files?.[field] || []);

const uploadPhotos = async (files) => {
    const urls = [];
    for (const file of files) {
        const uploaded = await uploadOnCloudinary(file.path);
        if (!uploaded?.secure_url) {
            throw new ApiError(502, "An image could not be stored. Please retry the upload.");
        }
        urls.push(uploaded.secure_url);
    }
    return urls;
};


const registerSalon = asyncHandler(async (req, res) => {
    const { name, city, state, pincode, description, address, contactNumber, openingHours, closingHours, totalSeats } = req.body

    if (!name || !address || !city) {
        throw new ApiError(400, "Name, address, and city are required")
    }

    const beforeFiles = filesFor(req, "beforePhotos");
    const afterFiles = filesFor(req, "afterPhotos");
    if (beforeFiles.length !== afterFiles.length) {
        throw new ApiError(400, "Upload the same number of before and after photos");
    }
    const [imageUrls, beforeUrls, afterUrls, transformationGallery] = await Promise.all([
        uploadPhotos(filesFor(req, "images")),
        uploadPhotos(beforeFiles),
        uploadPhotos(afterFiles),
        uploadPhotos(filesFor(req, "transformationPhotos")),
    ]);
    const beforeAfterPhotos = beforeUrls.map((beforeUrl, index) => ({
        beforeUrl,
        afterUrl: afterUrls[index],
    }));

    const salon = await Salon.create({
        name,
        city,
        state,
        pincode,
        description,
        address,
        contactNumber: contactNumber || req.user.phonenumber,
        openingHours,
        closingHours,
        totalSeats: totalSeats || 6,
        images: imageUrls,
        beforeAfterPhotos,
        transformationGallery,
        owner: req.user?._id,
        location: {
            type: "Point",
            coordinates: await geocodeAddress(`${address}, ${city}, ${state}, ${pincode}`) || [0, 0]
        }
    })

    if (!salon) {
        throw new ApiError(500, "Something went wrong while registering the salon")
    }

    // Ensure user role is salonOwner
    await User.findByIdAndUpdate(req.user?._id, { $set: { role: ROLES.OWNER } })

    // Trigger shop registered email silently
    if (req.user) {
        sendShopAddedEmail(req.user.email, req.user.fullName, salon.name);
    }

    return res.status(201).json(
        new ApiResponse(201, salon, "Salon registered successfully")
    )
})

import { searchSalonsNearby } from "../services/search.service.js";

const getSalons = asyncHandler(async (req, res) => {
    const { search, query, city, category, page = 1, limit = 8, longitude, latitude, maxDistanceMeters, rating } = req.query;

    const result = await searchSalonsNearby({
        longitude,
        latitude,
        maxDistanceMeters,
        city,
        category,
        rating,
        query: search || query,
        page,
        limit,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                salons: result.data,
                pagination: {
                    totalSalons: result.pagination.totalItems,
                    totalPages: result.pagination.totalPages,
                    currentPage: result.pagination.currentPage,
                    limit: result.pagination.limit,
                    hasNextPage: result.pagination.hasNext,
                    hasPrevPage: result.pagination.hasPrev,
                },
            },
            "Salons fetched successfully"
        )
    );
});


const getSalonById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Salon ID is required");
    }

    const salon = await Salon.findById(id).populate("owner", "fullName email phonenumber");

    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Keep the public seat count aligned with the configured chair capacity and active queue states.
    const activeBookingsCount = await Booking.countDocuments({
        salon: id,
        status: { $in: ["confirmed", "in_progress", "waiting", "arrived"] },
    });

    const totalSeats = Math.max(0, Number(salon.totalSeats || salon.maxConcurrentStaff) || 0);
    const availableSeats = Math.max(0, totalSeats - activeBookingsCount);

    let resolvedCoordinates = salon.location?.coordinates;
    const hasCoordinates = Array.isArray(resolvedCoordinates) && resolvedCoordinates.length === 2 &&
        resolvedCoordinates.every((value) => Number.isFinite(Number(value))) &&
        !(Number(resolvedCoordinates[0]) === 0 && Number(resolvedCoordinates[1]) === 0);

    if (!hasCoordinates) {
        resolvedCoordinates = await geocodeAddress(`${salon.address}, ${salon.city}, ${salon.state || ""}, ${salon.pincode || ""}`);
        if (resolvedCoordinates) {
            await Salon.updateOne({ _id: salon._id }, {
                $set: { location: { type: "Point", coordinates: resolvedCoordinates } },
            });
        }
    }

    // Merge into response
    const salonData = {
        ...salon.toObject(),
        availableSeats,
        location: {
            ...(salon.location?.toObject?.() || salon.location || {}),
            type: "Point",
            coordinates: resolvedCoordinates || [0, 0],
        },
    };

    return res.status(200).json(
        new ApiResponse(200, salonData, "Salon details with live availability fetched successfully")
    );
});

const getOwnerSalon = asyncHandler(async (req, res) => {
    const salons = await Salon.find({ owner: req.user?._id });

    return res.status(200).json(
        new ApiResponse(200, salons, "Owner salons fetched successfully")
    );
});

const updateSalonDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, city, state, pincode, address, description, openingHours, closingHours, isOpen } = req.body;

    const salon = await Salon.findById(id);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Ownership verification: Allow owner OR super_admin access
    const isOwner = salon.owner.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role?.toString().trim().toLowerCase() === "super_admin";

    if (!isOwner && !isSuperAdmin) {
        throw new ApiError(403, "Access Denied: You do not have permission to update this salon");
    }

    // Process new uploaded images
    const beforeFiles = filesFor(req, "beforePhotos");
    const afterFiles = filesFor(req, "afterPhotos");
    if (beforeFiles.length !== afterFiles.length) {
        throw new ApiError(400, "Upload the same number of before and after photos");
    }
    let retainedGallery = salon.transformationGallery || [];
    if (req.body.transformationGallery !== undefined) {
        let requestedGallery;
        try { requestedGallery = JSON.parse(req.body.transformationGallery); } catch {
            throw new ApiError(400, "Invalid transformation gallery data");
        }
        if (!Array.isArray(requestedGallery) || requestedGallery.some((url) => typeof url !== "string")) {
            throw new ApiError(400, "Invalid transformation gallery data");
        }
        const requestedUrls = new Set(requestedGallery);
        retainedGallery = retainedGallery.filter((url) => requestedUrls.has(url));
    }
    const [newImages, beforeUrls, afterUrls, newTransformations] = await Promise.all([
        uploadPhotos(filesFor(req, "images")),
        uploadPhotos(beforeFiles),
        uploadPhotos(afterFiles),
        uploadPhotos(filesFor(req, "transformationPhotos")),
    ]);
    let retainedTransformations = salon.beforeAfterPhotos || [];
    if (req.body.beforeAfterPhotos !== undefined) {
        let requested;
        try { requested = JSON.parse(req.body.beforeAfterPhotos); } catch {
            throw new ApiError(400, "Invalid transformation gallery data");
        }
        if (!Array.isArray(requested)) throw new ApiError(400, "Invalid transformation gallery data");
        const requestedIds = new Set(requested.map((photo) => String(photo?._id || "")));
        retainedTransformations = retainedTransformations.filter((photo) => requestedIds.has(String(photo._id)));
    }
    const appendedTransformations = beforeUrls.map((beforeUrl, index) => ({ beforeUrl, afterUrl: afterUrls[index] }));

    const updatedSalon = await Salon.findByIdAndUpdate(
        id,
        {
            $set: {
                name,
                city,
                state,
                pincode,
                address,
                description,
                openingHours,
                closingHours,
                isOpen,
                images: [...(salon.images || []), ...newImages],
                beforeAfterPhotos: [...retainedTransformations, ...appendedTransformations],
                transformationGallery: [...retainedGallery, ...newTransformations],
                location: address || city || state || pincode ? {
                    type: "Point",
                    coordinates: await geocodeAddress(`${address || salon.address}, ${city || salon.city}, ${state || salon.state}, ${pincode || salon.pincode}`) || salon.location?.coordinates || [0, 0]
                } : salon.location
            }
        },
        { new: true }
    );

    // --- SOCKET.IO EMIT ---
    if (isOpen !== undefined) {
        emitToAll("salonStatusUpdate", { salonId: id, isOpen });
    }


    return res.status(200).json(
        new ApiResponse(200, updatedSalon, "Salon details updated successfully")
    );
});

const getCheapestSalons = asyncHandler(async (req, res) => {
    const { limit = 15 } = req.query;

    const basicKeywords = ['haircut', 'beard', 'facial', 'massage', 'shave', 'manicure', 'pedicure', 'waxing', 'threading', 'hair color', 'hair wash', 'hair spa', 'cleanup'];
    const keywordRegex = basicKeywords.join('|');

    const services = await Service.find({
        price: { $exists: true, $gt: 0 },
        name: { $regex: keywordRegex, $options: 'i' }
    })
        .populate('salon', 'name city images')
        .sort({ price: 1 })
        .limit(parseInt(limit));

    // Filter out any where salon wasn't found
    const valid = services.filter(s => s.salon);

    return res.status(200).json(
        new ApiResponse(200, { services: valid }, "Cheapest services fetched successfully")
    );
});

const getSalonCities = asyncHandler(async (req, res) => {
    const cities = await Salon.aggregate([
        { $match: { city: { $exists: true, $ne: "" } } },
        { 
            $group: { 
                _id: { $toLower: "$city" }, 
                name: { $first: "$city" }, 
                state: { $first: "$state" },
                salonCount: { $sum: 1 },
                coordinates: { $first: "$location.coordinates" },
            } 
        },
        {
            $project: {
                _id: 1,
                name: 1,
                state: 1,
                salonCount: 1,
                coordinates: 1,
                lng: { $cond: [{ $isArray: "$coordinates" }, { $arrayElemAt: ["$coordinates", 0] }, null] },
                lat: { $cond: [{ $isArray: "$coordinates" }, { $arrayElemAt: ["$coordinates", 1] }, null] }
            }
        },
        { $sort: { salonCount: -1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, cities, "Cities fetched successfully")
    );
});

export { registerSalon, getSalons, getSalonById, getOwnerSalon, updateSalonDetails, getCheapestSalons, getSalonCities }
