import { Router } from "express";
import { handleTelegramWebhook } from "../controllers/telegramWebhook.controller";

const router = Router();

// Public webhook route for Telegram Bot API
router.post("/webhook", handleTelegramWebhook);

export default router;
