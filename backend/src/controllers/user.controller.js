import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { sendWelcomeEmail, sendLoginEmail } from "../utils/mailer.js"

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

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, phonenumber, role = "customer" } = req.body
    
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
        throw new ApiError(409, "User with eamil or username already exists")
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        phonenumber,
        role
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken')
    if (!createdUser) {
        throw new ApiError(505, "Something went wrong registering the user")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    // Trigger welcome email silently
    sendWelcomeEmail(createdUser.email, createdUser.fullName);

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: createdUser, accessToken, refreshToken }, "User registered Successfully")
        )
})

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

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUSer = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
    }

    // Trigger login email silently
    sendLoginEmail(loggedInUSer.email, loggedInUSer.fullName);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
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

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out Successfully"))
})

const updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body

    if (!role || !["customer", "salonOwner"].includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
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
    const { fullName, phonenumber, notes, allergies, preferredStylist } = req.body

    if (!fullName || !phonenumber) {
        throw new ApiError(400, "Full name and phone number are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                phonenumber,
                notes,
                allergies,
                preferredStylist
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    updateUserRole,
    updateAccountDetails
}
