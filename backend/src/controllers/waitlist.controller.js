import { Waitlist } from "../models/waitlist.models.js";
import { Notification } from "../models/notification.models.js";

const addToWaitlist = async (req, res) => {
  try {
    const { userId, salonId, preferredDate, preferredTimeRange, preferredStaff, services, notes } = req.body;
    
    if (!userId || !salonId || !preferredDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const wait = await Waitlist.create({
      customer: userId,
      salon: salonId,
      preferredDate,
      preferredTimeRange,
      preferredStaff,
      services,
      notes
    });

    return res.status(201).json({ success: true, data: wait });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getWaitlistBySalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const list = await Waitlist.find({ 
      salon: salonId,
      status: { $in: ["waiting", "offered"] }
    }).populate("customer", "fullName username phonenumber email")
      .populate("preferredStaff", "name role")
      .populate("services", "name price")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const notifyWaitlistClient = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const wait = await Waitlist.findById(waitlistId).populate("customer", "_id fullName");
    
    if (!wait) return res.status(404).json({ success: false, message: "Entry not found" });

    // Simulate sending an offer (via in-app notification)
    await Notification.create({
      recipient: wait.customer._id,
      title: "Waitlist Opening!",
      message: `A slot you were waiting for on ${wait.preferredDate} is now available. Click to book now!`,
      type: "booking_offer",
      link: `/booking/${wait.salon}`
    });

    wait.status = "offered";
    await wait.save();

    return res.status(200).json({ success: true, message: "Offer sent to client" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateWaitlistStatus = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const { status } = req.body;
    const wait = await Waitlist.findByIdAndUpdate(waitlistId, { status }, { new: true });
    return res.status(200).json({ success: true, data: wait });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  addToWaitlist,
  getWaitlistBySalon,
  notifyWaitlistClient,
  updateWaitlistStatus
};
