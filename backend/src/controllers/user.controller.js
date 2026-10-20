import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import jwt from "jsonwebtoken"
import { ApiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { sendWelcomeEmail, sendLoginEmail, sendLogoutEmail, sendVerificationEmail } from "../utils/mailer.js"
import { ROLES } from "../constants.js"
import { generateOTP, hashOTP, verifyOTPHash, checkOTPLockout, recordOTPAttempt, clearOTPState, checkOTPRequestRateLimit } from "../utils/otp.js"
import { issueTokenPair, rotateRefreshToken, revokeSession, revokeAllUserSessions } from "../services/auth.service.js"
import { pickAllowedFields, USER_UPDATABLE_FIELDS } from "../utils/dto.js"
import logger from "../lib/logger.js"


const VERIFICATION_CODE_EXPIRY_MINUTES = 5;

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        await user.setRefreshToken(refreshToken)
        await user.save({
            validateBeforeSave: false
        }) //jab bhi save karate hai to mongoose ke field kin in ho jata hai to wo save hone se pahke ye puchhta hai ki pass word kaha hai to usi ko resolve karne ke liye false kiye hai

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

// Helper: Build cookie options based on environment
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax"
    };
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email: rawEmail, username, password, phonenumber, role = "unassigned" } = req.body
    const email = rawEmail.trim().toLowerCase();
    
    if (
        [
            fullName, email, username, password, phonenumber
        ].some((field) => !field || field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    await checkOTPRequestRateLimit(email, req.ip);

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // Generate a secure 4-digit verification code and hash it for storage
    const rawVerificationCode = generateOTP();
    const verificationCodeHash = hashOTP(rawVerificationCode);
    const verificationCodeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        phonenumber,
        role,
        isVerified: false,
        verificationCode: verificationCodeHash,
        verificationCodeExpiry
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken -verificationCode -verificationCodeExpiry')
    if (!createdUser) {
        throw new ApiError(505, "Something went wrong registering the user")
    }

    // Send verification email with raw code (do not await to avoid blocking response)
    sendVerificationEmail(email, fullName, rawVerificationCode).catch(err => {
        logger.warn({ err: err.message }, "[User] Failed to send verification email");
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, { email: createdUser.email }, "Account created! Please check your email for the 4-digit verification code.")
        )
})

const verifyEmail = asyncHandler(async (req, res) => {
    const { email: rawEmail, code } = req.body;
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !code) {
        throw new ApiError(400, "Email and verification code are required");
    }

    // Check if account is locked out due to prior failed attempts
    await checkOTPLockout(email);

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified. Please log in.");
    }

    // Check if code has expired
    if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
        throw new ApiError(400, "Verification code has expired. Please request a new one.");
    }

    // Check if code matches (constant-time comparison against SHA-256 hash)
    const isValid = verifyOTPHash(code.toString(), user.verificationCode);
    if (!isValid) {
        await recordOTPAttempt(email);
        throw new ApiError(400, "Invalid verification code");
    }

    // Clear attempt/lockout state in Redis
    await clearOTPState(email);

    // Mark user as verified and clear the code fields
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    // Now generate tokens for the newly verified user
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const verifiedUser = await User.findById(user._id).select("-password -refreshToken -verificationCode -verificationCodeExpiry");

    const options = getCookieOptions();
    const accessTokenOptions = { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 };
    const refreshTokenOptions = { ...options, maxAge: 15 * 24 * 60 * 60 * 1000 };

    // Send welcome email silently
    sendWelcomeEmail(verifiedUser.email, verifiedUser.fullName).catch(err => {
        logger.warn({ err: err.message }, "[User] Failed to send welcome email");
    });

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(200, { user: verifiedUser, accessToken, refreshToken }, "Email verified successfully! Welcome to SalonNow.")
        );
});

const resendVerificationCode = asyncHandler(async (req, res) => {
    const { email: rawEmail } = req.body;
    const email = rawEmail?.trim().toLowerCase();

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    await checkOTPRequestRateLimit(email, req.ip);
    await checkOTPLockout(email);

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        throw new ApiError(400, "This email is already verified. Please log in.");
    }

    // Generate a fresh 4-digit code and hash it
    const rawVerificationCode = generateOTP();
    const verificationCodeHash = hashOTP(rawVerificationCode);
    const verificationCodeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

    user.verificationCode = verificationCodeHash;
    user.verificationCodeExpiry = verificationCodeExpiry;
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(email, user.fullName, rawVerificationCode).catch(err => {
        logger.warn({ err: err.message }, "[User] Failed to resend verification email");
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { email }, "A new verification code has been sent to your email."));
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email: rawEmail, password } = req.body
    const email = rawEmail?.trim().toLowerCase();
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordcorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credential")
    }

    // Block login for unverified users and resend a fresh code
    if (!user.isVerified) {
        await checkOTPRequestRateLimit(user.email, req.ip);
        await checkOTPLockout(user.email);
        const rawVerificationCode = generateOTP();
        const verificationCodeHash = hashOTP(rawVerificationCode);
        const verificationCodeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

        user.verificationCode = verificationCodeHash;
        user.verificationCodeExpiry = verificationCodeExpiry;
        await user.save({ validateBeforeSave: false });

        sendVerificationEmail(user.email, user.fullName, rawVerificationCode).catch(err => {
            logger.warn({ err: err.message }, "[User] Failed to resend verification email on login");
        });

        throw new ApiError(403, "Email not verified. A new verification code has been sent to your email.")
    }


    // Issue token pair with family tracking and JTI claims (Part 4)
    const deviceId = req.headers["user-agent"] || "unknown";
    const { accessToken, refreshToken } = await issueTokenPair(user, deviceId);

    const loggedInUSer = await User.findById(user._id).select("-password -refreshToken -verificationCode -verificationCodeExpiry")

    const options = getCookieOptions();
    const accessTokenOptions = { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 };
    const refreshTokenOptions = { ...options, maxAge: 15 * 24 * 60 * 60 * 1000 };

    sendLoginEmail(loggedInUSer.email, loggedInUSer.fullName).catch(err => {
        logger.warn({ err: err.message }, "[User] Failed to send login notification email");
    });

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUSer, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    // Revoke all sessions for this user in Redis & Mongo (SI6)
    await revokeAllUserSessions(req.user._id);

    sendLogoutEmail(req.user.email, req.user.fullName).catch(err => {
        logger.warn({ err: err.message }, "[User] Failed to send logout notification email");
    });

    const options = getCookieOptions();

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully across all devices"));
});

const logoutAllDevices = asyncHandler(async (req, res) => {
    await revokeAllUserSessions(req.user._id);
    const options = getCookieOptions();
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "All active devices logged out successfully"));
});

const updateUserRole = asyncHandler(async (req, res) => {
    const { role, userId } = req.body
    
    // Only super_admin can change user roles
    if (!req.user?._id) {
        throw new ApiError(401, "Authentication required to update role")
    }

    const requesterRole = req.user.role?.toString().trim().toLowerCase();
    if (requesterRole !== ROLES.ADMIN.toLowerCase()) {
        throw new ApiError(403, "Forbidden — only super_admin can change user roles")
    }

    if (!role || !Object.values(ROLES).includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    // Admin specifies which user to update via userId, fallback to self
    const targetUserId = userId || req.user._id;

    const user = await User.findByIdAndUpdate(
        targetUserId,
        {
            $set: {
                role: role
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User role updated successfully"))
})

const selectOwnRole = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new ApiError(401, "Authentication required to select a role")
    }

    const { role } = req.body;
    if (![ROLES.CUSTOMER, ROLES.OWNER].includes(role)) {
        throw new ApiError(400, "Choose either Customer or Salon Owner")
    }

    const user = await User.findOneAndUpdate(
        { _id: req.user._id, role: ROLES.UNASSIGNED },
        { $set: { role } },
        { new: true }
    ).select("-password -refreshToken -verificationCode -verificationCodeExpiry");

    if (!user) {
        throw new ApiError(409, "Your account role has already been selected")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account role selected successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, phonenumber } = req.body

    // Explicitly check if user is attached by verifyJWT middleware
    if (!req.user?._id) {
        throw new ApiError(401, "Authentication required to update account details")
    }

    if (!fullName || !phonenumber) {
        throw new ApiError(400, "Full name and phone number are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                phonenumber
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const toggleFavorite = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const userId = req.user._id;

    if (!salonId) {
        throw new ApiError(400, "Salon ID is required");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isFavorited = user.favorites.includes(salonId);

    if (isFavorited) {
        // Remove from favorites
        user.favorites = user.favorites.filter(id => id.toString() !== salonId.toString());
    } else {
        // Add to favorites
        user.favorites.push(salonId);
    }

    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, { isFavorited: !isFavorited, favorites: user.favorites }, "Favorites updated successfully")
    );
});

const getFavorites = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
        path: 'favorites',
        select: 'name city state address contactNumber images rating reviews openingHours closingHours availableSeats' // Include necessary salon fields
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, { favorites: user.favorites }, "Favorites fetched successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, { user: req.user }, "Current user fetched successfully")
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    // Call central auth service with automatic theft detection and rotation (SI7)
    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(incomingRefreshToken);

    const options = getCookieOptions();
    const accessTokenOptions = { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 };
    const refreshTokenOptions = { ...options, maxAge: 15 * 24 * 60 * 60 * 1000 };

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    updateUserRole,
    selectOwnRole,
    updateAccountDetails,
    toggleFavorite,
    getFavorites,
    getCurrentUser,
    verifyEmail,
    resendVerificationCode,
    refreshAccessToken
}
