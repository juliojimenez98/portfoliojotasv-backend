import { Router } from "express";
import { protect, authorize } from "../middlewares/auth";
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityLogs,
  completeActivity,
  checkInActivity,
  checkOutActivity,
  skipActivity,
} from "../controllers/activity.controller";

const router = Router();

router.use(protect);
router.use(authorize("actividades"));

router.route("/").get(getActivities).post(createActivity);
router.get("/logs", getActivityLogs);

router.route("/:id").put(updateActivity).delete(deleteActivity);
router.post("/:id/complete", completeActivity);
router.post("/:id/check-in", checkInActivity);
router.post("/:id/check-out", checkOutActivity);
router.post("/:id/skip", skipActivity);

export default router;
