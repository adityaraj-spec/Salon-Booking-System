import { Router } from "express";
import { registerUser, loginUser, logoutUser, updateUserRole, updateAccountDetails, changeCurrentPassword } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = Router()

router.route("/register").post(registerUser)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/update-role").patch(verifyJWT, updateUserRole)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)

export default router