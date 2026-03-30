import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Review } from "../models/review.models.js";
import { Salon } from "../models/salon.models.js";

const createReview = asyncHandler(async (req, res) => {
    const { salonId, rating, reviewText } = req.body;

    if (!salonId || !rating) {
        throw new ApiError(400, "Salon ID and rating are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Check if user already reviewed this salon
    const existingReview = await Review.findOne({
        salon: salonId,
        user: req.user?._id
    });

    if (existingReview) {
        throw new ApiError(400, "You have already reviewed this salon");
    }

    const review = await Review.create({
        salon: salonId,
        user: req.user?._id,
        rating: Number(rating),
        reviewText: reviewText || ""
    });

    // Update Salon average rating
    const reviews = await Review.find({ salon: salonId });
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);

    await Salon.findByIdAndUpdate(salonId, {
        $set: { rating: Number(averageRating) }
    });

    return res.status(201).json(
        new ApiResponse(201, review, "Review added successfully")
    );
});

const getSalonReviews = asyncHandler(async (req, res) => {
    const { salonId } = req.params;

    if (!salonId) {
        throw new ApiError(400, "Salon ID is required");
    }

    const reviews = await Review.find({ salon: salonId })
        .populate("user", "fullName")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, reviews, "Reviews fetched successfully")
    );
});

export { createReview, getSalonReviews };
