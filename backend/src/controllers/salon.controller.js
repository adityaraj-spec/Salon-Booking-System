import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { Salon } from "../models/salon.models.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { sendShopAddedEmail } from "../utils/mailer.js"

const registerSalon = asyncHandler(async (req, res) => {
    const { name, city, description, address, openingHours, closingHours } = req.body

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
        description,
        address,
        openingHours,
        closingHours,
        images: imageUrls,
        owner: req.user?._id
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
    const { search, city, page = 1, limit = 8 } = req.query;
    
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
            { city: { $regex: search, $options: "i" } }
        ];
    }
    
    if (city) {
        query.city = { $regex: city, $options: "i" };
    }
    
    // Fetch total count for pagination metadata
    const totalSalons = await Salon.countDocuments(query);
    const totalPages = Math.ceil(totalSalons / pageLimit);

    // Fetch paginated salons
    const salons = await Salon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit);

    console.log("Salons fetched by API:", salons.length, "Total:", totalSalons, "Query:", query);
    
    return res.status(200).json(
        new ApiResponse(
            200, 
            { 
                salons, 
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

    const salon = await Salon.findById(id);

    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    return res.status(200).json(
        new ApiResponse(200, salon, "Salon details fetched successfully")
    );
});

export { registerSalon, getSalons, getSalonById }
