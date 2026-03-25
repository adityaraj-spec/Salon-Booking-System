import { Router } from "express";
import { registerUser, loginUser, logoutUser, updateUserRole } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = Router()

router.route("/register").post(registerUser)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/update-role").patch(verifyJWT, updateUserRole)

export default router