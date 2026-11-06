import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.js";
import * as queueController from "../controllers/queue.controller.js";

const router = Router();

// Public: view current queue status, workload, and wait times
router.get("/salon/:salonId", queueController.getSalonQueue);

// Customer or authenticated user: request a position in the queue
router.post("/request", verifyJWT, queueController.requestQueuePosition);

// Customer or owner: mark arrival / check-in
router.post("/:bookingId/check-in", verifyJWT, queueController.checkInCustomer);

// Owner / Admin: view incoming requests
router.get(
  "/salon/:salonId/requests",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.getIncomingRequests
);

// Owner / Admin: accept request into active queue
router.post(
  "/:bookingId/accept",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.acceptQueueRequest
);

// Owner / Admin: reject request
router.post(
  "/:bookingId/reject",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.rejectQueueRequest
);

// Owner / Admin / Staff: start service
router.post(
  "/:bookingId/start",
  verifyJWT,
  authorize("owner", "admin", "staff"),
  queueController.startQueueService
);

// Owner / Admin / Staff: complete service
router.post(
  "/:bookingId/complete",
  verifyJWT,
  authorize("owner", "admin", "staff"),
  queueController.completeQueueService
);

// Owner / Admin: reorder waiting queue
router.put(
  "/salon/:salonId/reorder",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.reorderQueue
);

// Owner / Admin: update queue settings (pause, resume, maxCapacity, timeouts)
router.patch(
  "/salon/:salonId/settings",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.updateQueueSettings
);


// Owner / Admin / Staff: propose extra services
router.post(
  "/:bookingId/propose-extras",
  verifyJWT,
  authorize("owner", "admin", "staff"),
  queueController.proposeExtraServices
);

// Customer or Owner: approve extra services
router.post(
  "/:bookingId/approve-extras",
  verifyJWT,
  queueController.approveExtraServices
);

// Customer or Owner: decline extra services
router.post(
  "/:bookingId/decline-extras",
  verifyJWT,
  queueController.declineExtraServices
);


// Owner / Admin: queue analytics report
router.get(
  "/salon/:salonId/analytics",
  verifyJWT,
  authorize("owner", "admin"),
  queueController.getQueueAnalytics
);

export default router;

