import { Booking } from "../models/booking.models.js";
import { Staff } from "../models/staff.models.js";
import { Salon } from "../models/salon.models.js";
import { Product } from "../models/product.models.js";

const getDashboardSnapshot = async (req, res) => {
  try {
    const { salonId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const bookings = await Booking.find({ 
      salon: salonId,
      date: today
    });

    const snapshot = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === "pending").length,
      confirmed: bookings.filter(b => b.status === "confirmed").length,
      completed: bookings.filter(b => b.status === "completed").length,
      noShows: bookings.filter(b => b.status === "no-show").length,
      cancelled: bookings.filter(b => b.status === "cancelled").length
    };

    return res.status(200).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getStaffLeaderboard = async (req, res) => {
  try {
    const { salonId } = req.params;
    
    // Aggregate bookings by staff for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    const bookings = await Booking.find({
      salon: salonId,
      date: { $gte: startDate },
      status: "completed"
    });

    const staffStats = {};
    
    // Initialize stats for all salon staff
    const allStaff = await Staff.find({ salon: salonId });
    allStaff.forEach(s => {
      staffStats[s.name] = {
        staffId: s._id,
        name: s.name,
        role: s.role,
        revenue: 0,
        bookings: 0,
        color: s.color,
        profilePic: s.profilePic
      };
    });

    bookings.forEach(b => {
      // Note: booking.staff currently stores a string (name or ID based on front/back)
      // Reference: booking.models.js shows staff is a String, ref Staff
      const sName = b.staff;
      if (staffStats[sName]) {
        staffStats[sName].revenue += (b.totalAmount || 0);
        staffStats[sName].bookings += 1;
      }
    });

    const leaderboard = Object.values(staffStats).sort((a, b) => b.revenue - a.revenue);

    return res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getInventoryAlerts = async (req, res) => {
  try {
    const { salonId } = req.params;
    const lowStock = await Product.find({
      salon: salonId,
      $expr: { $lte: ["$stock", "$threshold"] }
    });

    return res.status(200).json({
      success: true,
      count: lowStock.length,
      data: lowStock
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const { salonId } = req.params;
    
    // Get last 15 bookings/cancellations
    const activities = await Booking.find({ salon: salonId })
      .sort({ updatedAt: -1 })
      .limit(15)
      .populate("customer", "fullName username");

    const formattedActivities = activities.map(a => ({
      _id: a._id,
      customer: a.customer?.fullName || "Guest",
      action: a.status === "cancelled" ? "Cancelation detected" : `Booked ${a.serviceNames?.join(", ")}`,
      status: a.status,
      time: a.updatedAt,
      date: a.date,
      slot: a.time
    }));

    return res.status(200).json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export {
  getDashboardSnapshot,
  getStaffLeaderboard,
  getInventoryAlerts,
  getRecentActivity
};
