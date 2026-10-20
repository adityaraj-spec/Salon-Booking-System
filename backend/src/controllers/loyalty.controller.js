import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  getLoyaltyLedgerSummary,
  calculateLoyaltyDiscount,
} from "../services/loyalty.service.js";
import { User } from "../models/user.models.js";
import { LoyaltyLedger } from "../models/loyaltyLedger.model.js";

export const getLoyaltySummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getLoyaltyLedgerSummary(req.user._id);
  return res.status(200).json(new ApiResponse(200, summary, "Loyalty summary fetched successfully"));
});

export const getLoyaltyBalanceHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("loyaltyPoints").lean();
  const points = user?.loyaltyPoints || 0;
  const pointValueInr = 0.50;
  const currencyValue = parseFloat((points * pointValueInr).toFixed(2));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        points,
        loyaltyPoints: points,
        pointValueInr,
        currencyValue,
      },
      "Loyalty balance fetched"
    )
  );
});

export const getLoyaltyHistoryHandler = asyncHandler(async (req, res) => {
  const history = await LoyaltyLedger.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.status(200).json(
    new ApiResponse(200, { history }, "Loyalty transaction history fetched")
  );
});

export const calculateLoyaltyDiscountHandler = asyncHandler(async (req, res) => {
  const { subtotal, requestedPoints } = req.body || req.query;
  const user = await User.findById(req.user._id).select("loyaltyPoints").lean();
  const calculation = calculateLoyaltyDiscount(
    user?.loyaltyPoints || 0,
    Number(subtotal) || 0,
    requestedPoints ? Number(requestedPoints) : null
  );

  return res.status(200).json(
    new ApiResponse(200, calculation, "Loyalty discount calculation computed")
  );
});
