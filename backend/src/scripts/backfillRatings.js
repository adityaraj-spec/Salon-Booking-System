import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Salon } from "../models/salon.models.js";
import { Review } from "../models/review.models.js";

const backfillSalonRatings = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/salonnow";
  console.log("Connecting to MongoDB for rating backfill...", uri);
  await mongoose.connect(uri);

  const salons = await Salon.find({}, { _id: 1 });
  console.log(`Found ${salons.length} salons to process...`);

  for (const salon of salons) {
    const aggregateResult = await Review.aggregate([
      { $match: { salon: salon._id } },
      {
        $group: {
          _id: "$salon",
          ratingSum: { $sum: "$rating" },
          ratingCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    if (aggregateResult.length > 0) {
      const { ratingSum, ratingCount, avgRating } = aggregateResult[0];
      const roundedAvg = parseFloat(avgRating.toFixed(1));
      await Salon.findByIdAndUpdate(salon._id, {
        $set: {
          ratingSum,
          ratingCount,
          rating: roundedAvg,
        },
      });
      console.log(`[UPDATED] Salon ${salon._id}: sum=${ratingSum}, count=${ratingCount}, avg=${roundedAvg}`);
    } else {
      await Salon.findByIdAndUpdate(salon._id, {
        $set: { ratingSum: 0, ratingCount: 0, rating: 0 },
      });
      console.log(`[RESET] Salon ${salon._id}: sum=0, count=0, avg=0`);
    }
  }

  await mongoose.disconnect();
  console.log("Rating backfill complete.");
};

if (process.argv[1] && process.argv[1].endsWith("backfillRatings.js")) {
  backfillSalonRatings().catch(console.error);
}
