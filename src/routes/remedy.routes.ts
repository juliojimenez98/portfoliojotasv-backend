import { Router } from "express";
import { protect, authorize } from "../middlewares/auth";
import {
  getRemedies,
  createRemedy,
  updateRemedy,
  deleteRemedy,
  executeAction,
  getLogs,
  generateTelegramLinkCode,
  getTelegramStatus,
  unlinkTelegram,
  linkTelegramManual,
} from "../controllers/remedy.controller";

const router = Router();

router.use(protect);
router.use(authorize("remedios"));

router.route("/").get(getRemedies).post(createRemedy);
router.get("/logs", getLogs);
router.get("/telegram/status", getTelegramStatus);
router.post("/telegram/link-code", generateTelegramLinkCode);
router.post("/telegram/manual", linkTelegramManual);
router.post("/telegram/unlink", unlinkTelegram);

router.route("/:id").put(updateRemedy).delete(deleteRemedy);
router.post("/:id/action", executeAction);

export default router;
