import { Salon } from "../models/salon.models.js";
import { formatPaginatedResponse } from "../utils/pagination.js";
import { cacheGet, cacheSet } from "../lib/cacheManager.js";
import crypto from "crypto";

/**
 * Performs high-performance 2dsphere geospatial search with filters and pagination.
 */
export const searchSalonsNearby = async ({
  longitude,
  latitude,
  maxDistanceMeters = 10000,
  city,
  rating,
  query: searchQuery,
  page = 1,
  limit = 10,
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (parsedPage - 1) * parsedLimit;

  // 1. Redis cache lookup
  const cacheKeyParams = `${longitude}_${latitude}_${maxDistanceMeters}_${city}_${rating}_${searchQuery}_${parsedPage}_${parsedLimit}`;
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
    matchFilter.city = new RegExp(city, "i");
  }
  if (rating) {
    matchFilter.rating = { $gte: parseFloat(rating) };
  }
  if (searchQuery) {
    matchFilter.name = new RegExp(searchQuery, "i");
  }

  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  // Faceted aggregation for count and pagination
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: parsedLimit }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [aggregateResult] = await Salon.aggregate(pipeline);

  const salonsData = aggregateResult?.data || [];
  const totalItems = aggregateResult?.totalCount[0]?.count || 0;

  const result = formatPaginatedResponse({
    data: salonsData,
    totalItems,
    page: parsedPage,
    limit: parsedLimit,
  });

  // 3. Cache result for 60 seconds
  await cacheSet(cacheKey, result, 60);

  return result;
};
