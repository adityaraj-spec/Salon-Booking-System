import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Review } from "../models/review.models.js";
import { Salon } from "../models/salon.models.js";
import { Booking } from "../models/booking.models.js";
import mongoose from "mongoose";

const createReview = asyncHandler(async (req, res) => {
    const { salonId, booking: bookingId, rating, reviewText } = req.body;

    if (!salonId || !bookingId || rating === undefined) {
        throw new ApiError(400, "Salon ID, completed booking, and rating are required");
    }

    if (![salonId, bookingId].every((id) => mongoose.isValidObjectId(id))) {
        throw new ApiError(400, "Invalid salon or booking ID");
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new ApiError(400, "Rating must be an integer between 1 and 5");
    }
    if (typeof reviewText !== "undefined" && (typeof reviewText !== "string" || reviewText.length > 2000)) {
        throw new ApiError(400, "Review text must be at most 2000 characters");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    const booking = await Booking.findOne({
        _id: bookingId,
        salon: salonId,
        customer: req.user._id,
        status: "completed",
    }).select("_id");
    if (!booking) {
        throw new ApiError(400, "A completed booking at this salon is required to leave a review");
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
        booking: booking._id,
        rating: numericRating,
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

const deleteReview = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    // Only the review author can delete it
    if (review.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this review");
    }

    const salonId = review.salon;
    await Review.findByIdAndDelete(reviewId);

    // Recalculate salon average rating
    const remainingReviews = await Review.find({ salon: salonId });
    const newRating = remainingReviews.length > 0
        ? (remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length).toFixed(1)
        : 0;

    await Salon.findByIdAndUpdate(salonId, { $set: { rating: Number(newRating) } });

    return res.status(200).json(
        new ApiResponse(200, {}, "Review deleted successfully")
    );
});

const toggleLike = asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
        throw new ApiError(404, "Review not found");
    }

    const alreadyLiked = (review.likes || []).some(
        (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
        // Unlike
        await Review.findByIdAndUpdate(reviewId, { $pull: { likes: userId } });
    } else {
        // Like
        await Review.findByIdAndUpdate(reviewId, { $addToSet: { likes: userId } });
    }

    const updated = await Review.findById(reviewId);
    return res.status(200).json(
        new ApiResponse(200, {
            likes: updated.likes,
            likeCount: updated.likes.length,
            liked: !alreadyLiked
        }, alreadyLiked ? "Review unliked" : "Review liked")
    );
});

export { createReview, getSalonReviews, deleteReview, toggleLike };
