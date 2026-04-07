import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Staff } from "../models/staff.models.js";
import { Salon } from "../models/salon.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const addStaff = asyncHandler(async (req, res) => {
    const { salonId, name, role, experience, skills, color } = req.body;

    if (!salonId || !name || !role) {
        throw new ApiError(400, "Salon ID, name, and role are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Security: Only owner can add staff
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to add staff to this salon");
    }

    let profilePicUrl = "";
    if (req.file) {
        const uploadedFile = await uploadOnCloudinary(req.file.path);
        if (uploadedFile) {
            profilePicUrl = uploadedFile.url;
        }
    }

    const parsedSkills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : (skills || []);

    const staff = await Staff.create({
        salon: salonId,
        name,
        role,
        experience: experience || 0,
        skills: parsedSkills,
        color: color || "#D4AF37",
        profilePic: profilePicUrl
    });

    return res.status(201).json(
        new ApiResponse(201, staff, "Staff member added successfully")
    );
});

const getSalonStaff = asyncHandler(async (req, res) => {
    const { salonId } = req.params;

    if (!salonId) {
        throw new ApiError(400, "Salon ID is required");
    }

    const staffMembers = await Staff.find({ salon: salonId }).sort({ name: 1 });

    return res.status(200).json(
        new ApiResponse(200, staffMembers, "Staff members fetched successfully")
    );
});

const deleteStaff = asyncHandler(async (req, res) => {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId);
    if (!staff) {
        throw new ApiError(404, "Staff member not found");
    }

    const salon = await Salon.findById(staff.salon);
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to delete this staff member");
    }

    await Staff.findByIdAndDelete(staffId);

    return res.status(200).json(
        new ApiResponse(200, {}, "Staff member deleted successfully")
    );
});

const updateStaff = asyncHandler(async (req, res) => {
    const { staffId } = req.params;
    const { name, role, experience, skills, color } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
        throw new ApiError(404, "Staff member not found");
    }

    const salon = await Salon.findById(staff.salon);
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this staff member");
    }

    let profilePicUrl = staff.profilePic;
    if (req.file) {
        const uploadedFile = await uploadOnCloudinary(req.file.path);
        if (uploadedFile) {
            profilePicUrl = uploadedFile.url;
        }
    }

    const parsedSkills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : (skills || staff.skills);

    const updatedStaff = await Staff.findByIdAndUpdate(
        staffId,
        {
            $set: {
                name,
                role,
                experience,
                skills: parsedSkills,
                color,
                profilePic: profilePicUrl
            }
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedStaff, "Staff member updated successfully")
    );
});

export { addStaff, getSalonStaff, deleteStaff, updateStaff };
