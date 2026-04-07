import { Router } from "express";
import { 
  addProduct, 
  getProductsBySalon, 
  updateProduct, 
  deleteProduct 
} from "../controllers/inventory.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/add").post(addProduct);
router.route("/salon/:salonId").get(getProductsBySalon);
router.route("/:productId").patch(updateProduct).delete(deleteProduct);

export default router;
