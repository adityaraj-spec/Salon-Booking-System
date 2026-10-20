import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Salon } from "../models/salon.models.js";
import { Service } from "../models/service.models.js";
import { Booking } from "../models/booking.models.js";
import { Staff } from "../models/staff.models.js";
import { Notification } from "../models/notification.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
    sendListingUpdateEmail,
    sendManagementUpdateEmail,
    sendBookingConfirmationEmail,
    sendAppointmentCancelledEmail,
} from "../utils/mailer.js";
import { emitToUser } from "../socket.js";
import { pickAllowedFields, STAFF_UPDATABLE_FIELDS } from "../utils/dto.js";
import logger from "../lib/logger.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Get the salon owned by the requesting user. Throws 404 if none. */
const getOwnerSalonOrThrow = async (userId) => {
    const salon = await Salon.findOne({ owner: userId });
    if (!salon) throw new ApiError(404, "No salon found for this owner");
    return salon;
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

const getOwnerDashboard = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);

    const [totalBookings, revenueAgg, totalServices, totalStaff] = await Promise.all([
        Booking.countDocuments({ salon: salon._id }),
        Booking.aggregate([
            { $match: { salon: salon._id, status: { $in: ["completed", "confirmed"] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        Service.countDocuments({ salon: salon._id }),
        Staff.countDocuments({ salon: salon._id })
    ]);

    // Recent 5 bookings for this salon
    const recentBookings = await Booking.find({ salon: salon._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customer", "fullName email");

    // Bookings chart — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyBookings = await Booking.aggregate([
        { $match: { salon: salon._id, createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return res.status(200).json(new ApiResponse(200, {
        salon,
        stats: {
            totalBookings,
            totalRevenue: revenueAgg[0]?.total || 0,
            totalServices,
            totalStaff
        },
        recentBookings,
        dailyBookings
    }, "Owner dashboard fetched"));
});

// ─── SALON ───────────────────────────────────────────────────────────────────

const getOwnerSalon = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const populated = await salon.populate("owner", "fullName email");
    return res.status(200).json(new ApiResponse(200, populated, "Salon fetched"));
});

const updateOwnerSalon = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { name, city, state, pincode, description, address, contactNumber, openingHours, closingHours, totalSeats } = req.body;

    const imagesLocalPaths = req.files?.map(f => f.path) || [];
    const newImageUrls = [];
    for (const path of imagesLocalPaths) {
        const uploaded = await uploadOnCloudinary(path);
        if (uploaded) newImageUrls.push(uploaded.secure_url);
    }

    const updates = {};
    if (name) updates.name = name;
    if (city) updates.city = city;
    if (state) updates.state = state;
    if (pincode) updates.pincode = pincode;
    if (description !== undefined) updates.description = description;
    if (address) updates.address = address;
    if (contactNumber) updates.contactNumber = contactNumber;
    if (openingHours) updates.openingHours = openingHours;
    if (closingHours) updates.closingHours = closingHours;
    if (totalSeats) updates.totalSeats = totalSeats;
    if (newImageUrls.length > 0) updates.images = [...(salon.images || []), ...newImageUrls];

    const updated = await Salon.findByIdAndUpdate(salon._id, { $set: updates }, { new: true });

    // Notify owner of successful salon listing update
    sendListingUpdateEmail(req.user.email, req.user.fullName, updated.name, "Your salon details have been successfully updated.")
        .catch(err => logger.warn({ err: err?.message }, "[Owner] Failed to send listing update email"));

    return res.status(200).json(new ApiResponse(200, updated, "Salon updated successfully"));
});

// ─── SERVICES ────────────────────────────────────────────────────────────────

const getOwnerServices = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { salon: salon._id };
    if (search) query.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [services, total] = await Promise.all([
        Service.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Service.countDocuments(query)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        services,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Services fetched"));
});

const createOwnerService = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { name, category, price, duration, description } = req.body;
    if (!name) throw new ApiError(400, "Service name is required");
    const service = await Service.create({ name, category, price, duration, description, salon: salon._id });

    // Notify owner of new service
    sendManagementUpdateEmail(req.user.email, req.user.fullName, salon.name, `New service "${name}" has been added to your salon.`)
        .catch(err => logger.warn({ err: err?.message }, "[Owner] Failed to send service creation email"));

    return res.status(201).json(new ApiResponse(201, service, "Service created"));
});

const updateOwnerService = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { id } = req.params;
    // Ensure the service belongs to this owner's salon
    const service = await Service.findOne({ _id: id, salon: salon._id });
    if (!service) throw new ApiError(404, "Service not found or unauthorized");

    // Whitelist allowed fields to prevent field injection (e.g. changing salon ownership)
    const allowedFields = ['name', 'category', 'price', 'duration', 'description'];
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await Service.findByIdAndUpdate(id, { $set: updates }, { new: true });

    // Notify owner of service update
    sendManagementUpdateEmail(req.user.email, req.user.fullName, salon.name, `Service "${updated.name}" details have been successfully updated.`)
        .catch(err => logger.warn({ err: err?.message }, "[Owner] Failed to send service update email"));

    return res.status(200).json(new ApiResponse(200, updated, "Service updated"));
});

const deleteOwnerService = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { id } = req.params;
    const service = await Service.findOne({ _id: id, salon: salon._id });
    if (!service) throw new ApiError(404, "Service not found or unauthorized");
    await Service.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, {}, "Service deleted"));
});

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

const getOwnerBookings = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { page = 1, limit = 10, status = "" } = req.query;
    const query = { salon: salon._id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate("customer", "fullName email phonenumber")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Booking.countDocuments(query)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        bookings,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Bookings fetched"));
});

const updateOwnerBookingStatus = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled", "rejected"];
    if (!validStatuses.includes(status)) throw new ApiError(400, "Invalid status");

    const booking = await Booking.findOne({ _id: id, salon: salon._id }).populate("customer", "fullName email");
    if (!booking) throw new ApiError(404, "Booking not found or unauthorized");

    booking.status = status;
    await booking.save();

    // Route to the correct email template based on the new booking status
    if (booking.customer?.email) {
        const bookingTime = booking.startTime
            ? booking.startTime.toISOString()
            : `${booking.date || ""} at ${booking.time || ""}`;
        const bookingRef = booking._id.toString();
        const customerEmail = booking.customer.email;
        const customerName = booking.customer.fullName;

        if (status === "cancelled" || status === "rejected") {
            sendAppointmentCancelledEmail(
                customerEmail, customerName, salon.name, bookingTime, bookingRef,
                `Your appointment has been ${status} by the salon`
            ).catch(err => logger.warn({ err: err.message }, "[Owner] Failed to send cancellation email"));
        } else if (status === "confirmed") {
            sendBookingConfirmationEmail(
                customerEmail, customerName, salon.name, bookingTime, bookingRef,
                booking.serviceNames || [], booking.totalAmount
            ).catch(err => logger.warn({ err: err.message }, "[Owner] Failed to send confirmation email"));
        }
        // "completed" and "pending" — no outbound email
    }

    // Create notification for customer
    let title = "Booking Update";
    let type = "system";
    if (status === "confirmed") { title = "Booking Confirmed!"; type = "booking_confirmed"; }
    else if (status === "rejected") { title = "Booking Declined"; type = "booking_rejected"; }
    else if (status === "completed") { title = "Appointment Completed"; type = "booking_completed"; }

    const notification = await Notification.create({
        recipient: booking.customer._id,
        sender: req.user._id,
        title,
        message: `Your booking at ${salon.name} for ${booking.date} has been ${status}.`,
        type,
        bookingId: booking._id
    });

    // Socket.io emit to customer
    emitToUser(booking.customer._id, "newNotification", notification);
    emitToUser(booking.customer._id, "bookingUpdate", { booking, type: "STATUS_CHANGE" });

    return res.status(200).json(new ApiResponse(200, booking, "Status updated"));
});

// ─── STAFF ───────────────────────────────────────────────────────────────────

const getOwnerStaff = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const staff = await Staff.find({ salon: salon._id }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, { staff }, "Staff fetched"));
});

const createOwnerStaff = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { name, role, experience, skills } = req.body;
    if (!name) throw new ApiError(400, "Staff name is required");
    const staff = await Staff.create({ name, role, experience, skills, salon: salon._id });

    // Notify owner of new staff member
    sendManagementUpdateEmail(req.user.email, req.user.fullName, salon.name, `New staff member "${name}" (${role || "Stylist"}) has been added to your salon.`)
        .catch(err => logger.warn({ err: err?.message }, "[Owner] Failed to send staff creation email"));

    return res.status(201).json(new ApiResponse(201, staff, "Staff member added"));
});

const updateOwnerStaff = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { id } = req.params;
    const staff = await Staff.findOne({ _id: id, salon: salon._id });
    if (!staff) throw new ApiError(404, "Staff not found or unauthorized");

    // Fix C2: Whitelist allowed fields to prevent mass assignment (e.g. changing salon ID or user assignment)
    const safeUpdates = pickAllowedFields(req.body, STAFF_UPDATABLE_FIELDS);
    const updated = await Staff.findOneAndUpdate(
        { _id: id, salon: salon._id }, // scoped ownership query
        { $set: safeUpdates },
        { new: true }
    );

    // Notify owner of staff profile update
    sendManagementUpdateEmail(req.user.email, req.user.fullName, salon.name, `Staff member "${updated.name}" profile has been successfully updated.`)
        .catch(err => logger.warn({ err: err?.message }, "[Owner] Failed to send staff update email"));

    return res.status(200).json(new ApiResponse(200, updated, "Staff updated"));
});

const deleteOwnerStaff = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { id } = req.params;
    const staff = await Staff.findOne({ _id: id, salon: salon._id });
    if (!staff) throw new ApiError(404, "Staff not found or unauthorized");
    await Staff.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, {}, "Staff deleted"));
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

const getOwnerReports = asyncHandler(async (req, res) => {
    const salon = await getOwnerSalonOrThrow(req.user._id);
    const { from, to } = req.query;
    const match = { salon: salon._id, status: { $in: ["completed", "confirmed"] } };
    if (from || to) {
        match.createdAt = {};
        if (from) match.createdAt.$gte = new Date(from);
        if (to) match.createdAt.$lte = new Date(to);
    }

    const revenue = await Booking.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$totalAmount" },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return res.status(200).json(new ApiResponse(200, { revenue }, "Reports fetched"));
});

export {
    getOwnerDashboard,
    getOwnerSalon, updateOwnerSalon,
    getOwnerServices, createOwnerService, updateOwnerService, deleteOwnerService,
    getOwnerBookings, updateOwnerBookingStatus,
    getOwnerStaff, createOwnerStaff, updateOwnerStaff, deleteOwnerStaff,
    getOwnerReports
};
