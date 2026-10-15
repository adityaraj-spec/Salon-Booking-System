import { Router } from "express";
import {
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
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  registerUserSchema,
  loginUserSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  selectRoleSchema,
} from "../schemas/user.schema.js";

const router = Router();

router.route("/register").post(validate(registerUserSchema), registerUser);
router.route("/login").post(validate(loginUserSchema), loginUser);
router.route("/verify-email").post(validate(verifyEmailSchema), verifyEmail);
router.route("/resend-verification").post(validate(resendVerificationSchema), resendVerificationCode);
router.route("/refresh-token").post(refreshAccessToken);


router.route("/logout").post(verifyJWT, logoutUser);
router.route("/update-role").patch(verifyJWT, updateUserRole);
router.route("/select-role").patch(verifyJWT, validate(selectRoleSchema), selectOwnRole);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/favorites").get(verifyJWT, getFavorites);
router.route("/favorites/:salonId").post(verifyJWT, toggleFavorite);
router.route("/me").get(verifyJWT, getCurrentUser);

export default router;
