import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { sendWelcomeEmail, sendLoginEmail, sendLogoutEmail, sendVerificationEmail } from "../utils/mailer.js"
import { ROLES } from "../constants.js"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
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
    const isProduction = process.env.NODE_ENV === "production" || process.env.FRONTEND_URL?.includes('onrender.com');
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax"
    };
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, phonenumber, role = "unassigned" } = req.body
    
    if (
        [
            fullName, email, username, password, phonenumber
        ].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // Generate a 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        phonenumber,
        role,
        isVerified: false,
        verificationCode,
        verificationCodeExpiry
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken -verificationCode -verificationCodeExpiry')
    if (!createdUser) {
        throw new ApiError(505, "Something went wrong registering the user")
    }

    // Send verification email (do not await to avoid blocking response)
    sendVerificationEmail(email, fullName, verificationCode).catch(err => {
        console.error("[registerUser] Failed to send verification email:", err.message);
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, { email: createdUser.email }, "Account created! Please check your email for the 4-digit verification code.")
        )
})

const verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        throw new ApiError(400, "Email and verification code are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified. Please log in.");
    }

    // Check if code matches
    if (user.verificationCode !== code.toString()) {
        throw new ApiError(400, "Invalid verification code");
    }

    // Check if code has expired
    if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
        throw new ApiError(400, "Verification code has expired. Please request a new one.");
    }

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
        console.error("[verifyEmail] Failed to send welcome email:", err.message);
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
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
        throw new ApiError(400, "This email is already verified. Please log in.");
    }

    // Generate a fresh 4-digit code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 1 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = verificationCodeExpiry;
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(email, user.fullName, verificationCode).catch(err => {
        console.error("[resendVerificationCode] Failed to send email:", err.message);
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { email }, "A new verification code has been sent to your email."));
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body
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
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        const verificationCodeExpiry = new Date(Date.now() + 1 * 60 * 1000);

        user.verificationCode = verificationCode;
        user.verificationCodeExpiry = verificationCodeExpiry;
        await user.save({ validateBeforeSave: false });

        sendVerificationEmail(user.email, user.fullName, verificationCode).catch(err => {
            console.error("[loginUser] Failed to resend verification email:", err.message);
        });

        throw new ApiError(403, "Email not verified. A new verification code has been sent to your email.")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUSer = await User.findById(user._id).select("-password -refreshToken -verificationCode -verificationCodeExpiry")

    const options = getCookieOptions();
    const accessTokenOptions = { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 };
    const refreshTokenOptions = { ...options, maxAge: 15 * 24 * 60 * 60 * 1000 };

    // Trigger login email silently
    sendLoginEmail(loggedInUSer.email, loggedInUSer.fullName).catch(err => {
        console.error("[loginUser] Failed to send login email:", err.message);
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true
        }
    )

    const options = getCookieOptions();

    // Trigger logout email silently
    sendLogoutEmail(req.user.email, req.user.fullName).catch(err => {
        console.error("[logoutUser] Failed to send logout email:", err.message);
    });

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out Successfully"))
})

const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body
    
    // Explicitly check if user is attached by verifyJWT middleware
    if (!req.user?._id) {
        throw new ApiError(401, "Authentication required to update role")
    }

    if (!role || ![ROLES.CUSTOMER, ROLES.OWNER].includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
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

export {
    registerUser,
    loginUser,
    logoutUser,
    updateUserRole,
    updateAccountDetails,
    toggleFavorite,
    getFavorites,
    getCurrentUser,
    verifyEmail,
    resendVerificationCode
}
