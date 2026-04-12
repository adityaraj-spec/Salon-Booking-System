import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.models.js";
import { Salon } from "../models/salon.models.js";
import { Service } from "../models/service.models.js";
import { Booking } from "../models/booking.models.js";
import { Staff } from "../models/staff.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

const getDashboard = asyncHandler(async (req, res) => {
    const [totalSalons, totalCustomers, totalBookings, revenueAgg] = await Promise.all([
        Salon.countDocuments(),
        User.countDocuments({ role: "customer" }),
        Booking.countDocuments(),
        Booking.aggregate([
            { $match: { status: { $in: ["completed", "confirmed"] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ])
    ]);

    // Last 7 days bookings for chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyBookings = await Booking.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Recent 5 bookings
    const recentBookings = await Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customer", "fullName email")
        .populate("salon", "name city");

    return res.status(200).json(new ApiResponse(200, {
        stats: {
            totalSalons,
            totalCustomers,
            totalBookings,
            totalRevenue: revenueAgg[0]?.total || 0
        },
        dailyBookings,
        recentBookings
    }, "Dashboard data fetched"));
});

// ─── SALONS ──────────────────────────────────────────────────────────────────

const getAllSalons = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "", city = "" } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (city) query.city = { $regex: city, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [salons, total] = await Promise.all([
        Salon.find(query)
            .populate("owner", "fullName email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Salon.countDocuments(query)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        salons,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Salons fetched"));
});

const createSalon = asyncHandler(async (req, res) => {
    const { name, city, state, pincode, description, address, contactNumber, openingHours, closingHours, ownerId } = req.body;
    if (!name || !city || !address) throw new ApiError(400, "Name, city and address are required");

    let owner = ownerId;
    if (!owner) throw new ApiError(400, "Owner ID is required");

    const imagesLocalPaths = req.files?.map(f => f.path) || [];
    const imageUrls = [];
    for (const path of imagesLocalPaths) {
        const uploaded = await uploadOnCloudinary(path);
        if (uploaded) imageUrls.push(uploaded.url);
    }

    const salon = await Salon.create({
        name, city, state, pincode, description, address,
        contactNumber, openingHours, closingHours,
        images: imageUrls, owner,
    });

    // Ensure owner has salonOwner role
    await User.findByIdAndUpdate(owner, { $set: { role: "salonOwner" } });

    return res.status(201).json(new ApiResponse(201, salon, "Salon created successfully"));
});

const deleteSalon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const salon = await Salon.findByIdAndDelete(id);
    if (!salon) throw new ApiError(404, "Salon not found");
    return res.status(200).json(new ApiResponse(200, {}, "Salon deleted successfully"));
});

// ─── SERVICES ────────────────────────────────────────────────────────────────

const getAllServices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "", salonId = "" } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (salonId) query.salon = salonId;

    const skip = (Number(page) - 1) * Number(limit);
    const [services, total] = await Promise.all([
        Service.find(query).populate("salon", "name city").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Service.countDocuments(query)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        services,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Services fetched"));
});

const createService = asyncHandler(async (req, res) => {
    const { name, category, price, duration, description, salonId } = req.body;
    if (!name || !salonId) throw new ApiError(400, "Name and salon are required");
    const service = await Service.create({ name, category, price, duration, description, salon: salonId });
    return res.status(201).json(new ApiResponse(201, service, "Service created"));
});

const updateService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const service = await Service.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!service) throw new ApiError(404, "Service not found");
    return res.status(200).json(new ApiResponse(200, service, "Service updated"));
});

const deleteService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);
    if (!service) throw new ApiError(404, "Service not found");
    return res.status(200).json(new ApiResponse(200, {}, "Service deleted"));
});

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

const getAllBookings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status = "", salonId = "" } = req.query;
    const query = {};
    if (status) query.status = status;
    if (salonId) query.salon = salonId;

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate("customer", "fullName email phonenumber")
            .populate("salon", "name city")
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

const updateBookingStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled", "rejected"];
    if (!validStatuses.includes(status)) throw new ApiError(400, "Invalid status");
    const booking = await Booking.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!booking) throw new ApiError(404, "Booking not found");
    return res.status(200).json(new ApiResponse(200, booking, "Booking status updated"));
});

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

const getAllCustomers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { role: "customer" };
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
        User.find(query).select("-password -refreshToken").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        User.countDocuments(query)
    ]);

    return res.status(200).json(new ApiResponse(200, {
        customers,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Customers fetched"));
});

// ─── OWNERS ──────────────────────────────────────────────────────────────────

const getAllOwners = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { role: "salonOwner" };
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [owners, total] = await Promise.all([
        User.find(query).select("-password -refreshToken").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        User.countDocuments(query)
    ]);

    // Attach their salon to each owner
    const ownersWithSalon = await Promise.all(owners.map(async (owner) => {
        const salon = await Salon.findOne({ owner: owner._id }).select("name city");
        return { ...owner.toObject(), salon };
    }));

    return res.status(200).json(new ApiResponse(200, {
        owners: ownersWithSalon,
        pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }
    }, "Owners fetched"));
});

const createOwner = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, phonenumber } = req.body;
    if (!fullName || !email || !username || !password || !phonenumber) {
        throw new ApiError(400, "All fields are required");
    }
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) throw new ApiError(409, "User with email or username already exists");

    const owner = await User.create({ fullName, email, username, password, phonenumber, role: "salonOwner" });
    const created = await User.findById(owner._id).select("-password -refreshToken");
    return res.status(201).json(new ApiResponse(201, created, "Owner created successfully"));
});

const deleteOwner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, {}, "Owner deleted"));
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

const getRevenueReport = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const match = { status: { $in: ["completed", "confirmed"] } };
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

    return res.status(200).json(new ApiResponse(200, { revenue }, "Revenue report fetched"));
});

export {
    getDashboard,
    getAllSalons, createSalon, deleteSalon,
    getAllServices, createService, updateService, deleteService,
    getAllBookings, updateBookingStatus,
    getAllCustomers,
    getAllOwners, createOwner, deleteOwner,
    getRevenueReport
};
