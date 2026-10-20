import { Salon } from "../models/salon.models.js";
import { Service } from "../models/service.models.js";
import { formatPaginatedResponse } from "../utils/pagination.js";
import { cacheGet, cacheSet, registerSearchCacheKey, cacheSetSalonDetail } from "../lib/cacheManager.js";
import { transformImageUrl } from "../utils/imageTransform.js";
import { searchQueryDurationSeconds } from "../lib/metrics.js";
import crypto from "crypto";

/**
 * Performs high-performance 2dsphere geospatial & text search with filters, field projection,
 * Cloudinary image optimizations, and two-tier caching.
 */
export const searchSalonsNearby = async ({
  longitude,
  latitude,
  maxDistanceMeters = 10000,
  city,
  category,
  rating,
  query: searchQuery,
  page = 1,
  limit = 10,
}) => {
  const startHr = process.hrtime.bigint();
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50); // Hard cap at 50 per page
  const skip = (parsedPage - 1) * parsedLimit;

  // 1. Redis cache lookup
  const cacheKeyParams = `${longitude}_${latitude}_${maxDistanceMeters}_${city}_${category}_${rating}_${searchQuery}_${parsedPage}_${parsedLimit}`;
  const cacheHash = crypto.createHash("md5").update(cacheKeyParams).digest("hex");
  const cacheKey = `salons:search:${cacheHash}`;

  const cachedResult = await cacheGet(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 2. Build MongoDB aggregation pipeline
  const pipeline = [];

  const hasGeoParams =
    longitude !== undefined &&
    latitude !== undefined &&
    !isNaN(parseFloat(longitude)) &&
    !isNaN(parseFloat(latitude));

  if (hasGeoParams) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        distanceField: "distanceMeters",
        maxDistance: parseInt(maxDistanceMeters, 10),
        spherical: true,
      },
    });
  }

  const matchFilter = {};
  if (city) {
    matchFilter.city = new RegExp(`^${city.trim()}$`, "i"); // Exact city match anchored for index efficiency
  }
  if (category && category.trim()) {
    const cat = category.trim().toLowerCase();
    let catFilter;
    if (cat === "colour" || cat === "color") {
      catFilter = { $in: [/^colour$/i, /^color$/i] };
    } else {
      catFilter = new RegExp(`^${cat}$`, "i");
    }
    const matchingSalonIds = await Service.find({
      $or: [
        { category: catFilter },
        { name: new RegExp(cat, "i") },
      ],
    }).distinct("salon");
    matchFilter._id = { $in: matchingSalonIds };
  }
  if (rating) {
    matchFilter.rating = { $gte: parseFloat(rating) };
  }
  if (searchQuery && searchQuery.trim()) {
    // Utilize MongoDB full-text index when text query is provided
    matchFilter.$text = { $search: searchQuery.trim() };
  }

  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  // Add textScore sorting if text search is active and geoNear is not already sorting
  if (searchQuery && searchQuery.trim() && !hasGeoParams) {
    pipeline.push({ $sort: { score: { $meta: "textScore" }, rating: -1 } });
  } else if (!hasGeoParams) {
    pipeline.push({ $sort: { rating: -1, createdAt: -1 } });
  }


  // Field projection to keep payload light
  pipeline.push({
    $lookup: {
      from: "services",
      localField: "_id",
      foreignField: "salon",
      as: "_services",
      pipeline: [
        { $match: { price: { $gt: 0 } } },
        { $project: { price: 1, _id: 0 } },
      ],
    },
  });

  pipeline.push({
    $addFields: {
      startingPrice: {
        $cond: {
          if: { $gt: [{ $size: "$_services" }, 0] },
          then: { $min: "$_services.price" },
          else: null,
        },
      },
    },
  });

  pipeline.push({
    $project: {
      name: 1,
      city: 1,
      state: 1,
      rating: 1,
      ratingCount: 1,
      isOpen: 1,
      location: 1,
      distanceMeters: 1,
      address: 1,
      description: 1,
      images: 1,
      contactNumber: 1,
      openingHours: 1,
      closingHours: 1,
      startingPrice: 1,
    },
  });


  // Faceted aggregation for count and pagination
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: parsedLimit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [aggregateResult] = await Salon.aggregate(pipeline);

  let salonsData = aggregateResult?.data || [];
  const totalItems = aggregateResult?.totalCount[0]?.count || 0;

  // Transform Cloudinary image URLs for performance optimization
  salonsData = salonsData.map((salon) => {
    const optimizedImages = Array.isArray(salon.images)
      ? salon.images.map((img) => transformImageUrl(img, { width: 640 }))
      : [];
    
    const salonObj = {
      ...salon,
      images: optimizedImages,
      imageUrl: optimizedImages[0] || null, // Pre-computed primary image for fast UI rendering
    };

    // Asynchronously populate single salon detail cache
    cacheSetSalonDetail(salon._id, salonObj, 300).catch(() => {});

    return salonObj;
  });

  const result = formatPaginatedResponse({
    data: salonsData,
    totalItems,
    page: parsedPage,
    limit: parsedLimit,
  });

  // 3. Cache result in Redis (120s for geo-only, 60s for text search)
  const ttlSeconds = searchQuery ? 60 : 120;
  await cacheSet(cacheKey, result, ttlSeconds);
  if (city) {
    await registerSearchCacheKey(city, cacheKey, ttlSeconds);
  }

  // Record metric
  const durationSec = Number(process.hrtime.bigint() - startHr) / 1e9;
  try {
    searchQueryDurationSeconds.observe(
      { has_geo: hasGeoParams ? "true" : "false", has_text: searchQuery ? "true" : "false" },
      durationSec
    );
  } catch {}

  return result;
};
