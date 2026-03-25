import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { Salon } from "../models/salon.models.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerSalon = asyncHandler(async (req, res) => {
    const { name, description, address, openingHours, closingHours } = req.body

    if (!name || !address) {
        throw new ApiError(400, "Name and address are required")
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

    return res.status(201).json(
        new ApiResponse(201, salon, "Salon registered successfully")
    )
})

export { registerSalon }
