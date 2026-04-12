import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { Salon } from "../models/salon.models.js"
import { User } from "../models/user.models.js"
import { Booking } from "../models/booking.models.js" 
import { Service } from "../models/service.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { sendShopAddedEmail } from "../utils/mailer.js"
import { emitToAll } from "../socket.js";
import { geocodeAddress } from "../utils/geocoding.js";


const registerSalon = asyncHandler(async (req, res) => {
    const { name, city, state, pincode, description, address, contactNumber, openingHours, closingHours, totalSeats } = req.body

    if (!name || !address || !city) {
        throw new ApiError(400, "Name, address, and city are required")
    }

    const imagesLocalPaths = req.files?.map(file => file.path) || [];
    const imageUrls = [];

    if (imagesLocalPaths.length > 0) {
        for (const path of imagesLocalPaths) {
            const uploaded = await uploadOnCloudinary(path);
            if (uploaded) {
                imageUrls.push(uploaded.url);
            }
        }
    }

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
    await User.findByIdAndUpdate(req.user?._id, { $set: { role: "salonOwner" } })

    // Trigger shop registered email silently
    if (req.user) {
        sendShopAddedEmail(req.user.email, req.user.fullName, salon.name);
    }

    return res.status(201).json(
        new ApiResponse(201, salon, "Salon registered successfully")
    )
})

const getSalons = asyncHandler(async (req, res) => {
    const { search, city, page = 1, limit = 8, sortBy, sortOrder = "asc" } = req.query;
    
    // Parse pagination parameters
    const currentPage = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (currentPage - 1) * pageLimit;

    let query = {};
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { state: { $regex: search, $options: "i" } }
        ];
    }
    
    if (city) {
        query.city = { $regex: city, $options: "i" };
    }

    let salons;
    let totalSalons;

    if (sortBy === "price") {
        // Use aggregation to sort by minimum service price
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "services",
                    localField: "_id",
                    foreignField: "salon",
                    as: "services"
                }
            },
            {
                $addFields: {
                    minPrice: { $min: "$services.price" }
                }
            },
            { $sort: { minPrice: sortOrder === "asc" ? 1 : -1 } },
            { $skip: skip },
            { $limit: pageLimit }
        ];
        salons = await Salon.aggregate(pipeline);
        totalSalons = await Salon.countDocuments(query);
    } else {
        // Standard fetch
        totalSalons = await Salon.countDocuments(query);
        salons = await Salon.find(query)
            .populate("owner", "fullName phonenumber")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit);
    }

    // --- CALCULATE LIVE AVAILABILITY FOR THE LIST ---
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    const timeMatcher = new RegExp(`(^${hour}:|^0${hour}:|^${displayHour}:|^0${displayHour}:).*${ampm}|(^${hour}:|^0${hour}:)`, "i");

    const salonsWithAvailability = await Promise.all(salons.map(async (salonDoc) => {
        // If it was aggregation (raw obj) or find (mongoose doc)
        const salon = salonDoc.toObject ? salonDoc.toObject() : salonDoc;
        
        const activeBookingsCount = await Booking.countDocuments({
            salon: salon._id,
            date: today,
            status: { $in: ["pending", "confirmed"] },
            time: { $regex: timeMatcher }
        });

        const totalSeatsValue = salon.totalSeats || 6;
        const availableSeats = Math.max(0, totalSeatsValue - activeBookingsCount);

        return {
            ...salon,
            availableSeats
        };
    }));

    const totalPages = Math.ceil(totalSalons / pageLimit);
    
    return res.status(200).json(
        new ApiResponse(
            200, 
            { 
                salons: salonsWithAvailability, 
                pagination: { 
                    totalSalons, 
                    totalPages, 
                    currentPage, 
                    limit: pageLimit 
                } 
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

    // --- CALCULATE LIVE AVAILABILITY ---
    // 1. Get current date (matching backend Booking format: YYYY-MM-DD or similar)
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // "2024-04-06"
    
    // 2. Identify current hour for matching "time" string
    const hour = now.getHours(); // 0-23
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    
    // Flexible regex for "2:XX PM" or "14:XX"
    const timeMatcher = new RegExp(`(^${hour}:|^0${hour}:|^${displayHour}:|^0${displayHour}:).*${ampm}|(^${hour}:|^0${hour}:)`, "i");

    const activeBookingsCount = await Booking.countDocuments({
        salon: id,
        date: today,
        status: { $in: ["pending", "confirmed"] },
        time: { $regex: timeMatcher }
    });

    const totalSeats = salon.totalSeats || 6;
    const availableSeats = Math.max(0, totalSeats - activeBookingsCount);

    // Merge into response
    const salonData = {
        ...salon.toObject(),
        availableSeats
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

    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this salon");
    }

    // Process new uploaded images
    const imagesLocalPaths = req.files?.map(file => file.path) || [];
    const imageUrls = [...(salon.images || [])];

    if (imagesLocalPaths.length > 0) {
        for (const path of imagesLocalPaths) {
            const uploaded = await uploadOnCloudinary(path);
            if (uploaded) {
                imageUrls.push(uploaded.url);
            }
        }
    }

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
                images: imageUrls,
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

export { registerSalon, getSalons, getSalonById, getOwnerSalon, updateSalonDetails, getCheapestSalons }
