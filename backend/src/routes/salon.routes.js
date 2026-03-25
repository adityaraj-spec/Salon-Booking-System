import { registerSalon } from "../controllers/salon.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/register").post(
    verifyJWT, 
    upload.array("images", 10), 
    registerSalon
);

export default router;
