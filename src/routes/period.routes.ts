import { Router } from "express";
import {
  getPeriods,
  getActivePeriod,
  startPeriod,
  closePeriod,
  deletePeriod,
} from "../controllers/period.controller";
import { protect } from "../middlewares/auth";

const router = Router();
router.use(protect);

router.get("/", getPeriods);
router.get("/active", getActivePeriod);
router.post("/start", startPeriod);
router.post("/:id/close", closePeriod);
router.delete("/:id", deletePeriod);

export default router;
