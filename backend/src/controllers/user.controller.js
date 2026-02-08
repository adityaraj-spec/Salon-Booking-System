import {asyncHandler} from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async(req, res) => {
    const {fullName, email, username, password, phonenumber, role} = req.body

    if(
        [
           fullName, email, username, password, phonenumber, role 
        ].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with eamil or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        email, 
        username: username.toLowerCase(),
        password, 
        phonenumber, 
        role,
        avatar: avatar.url
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken')
    if(!createdUser){
        throw new ApiError(505, "Something went wrong registering the user")
    }

    return res.status(201).json(
        ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async(req, res) => {
   const { username, email, password } = req.body
   if(!username && !email){
    throw new ApiError(400, "username or email is required")
   }

   const user = findOne({
    $or: [{username}, {email}]
   })
   if(!user) {
        throw new ApiError(404, "User does not exist")
    }
})

export { 
    registerUser

}
