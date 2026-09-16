import Remedy from "../models/Remedy";
import RemedyLog from "../models/RemedyLog";
import User, { UserDocument } from "../models/User";
import {
  sendMedicationReminder,
  sendRepeatReminder,
  sendTelegramTextMessage,
} from "./telegramService";

export async function checkAndSendReminders() {
  try {
    const now = new Date();

    // 0. Auto-resume remedies whose pause duration has expired
    const expiredPausedRemedies = await Remedy.find({
      isActive: false,
      pausedUntil: { $ne: null, $lte: now },
    }).populate<{ userId: UserDocument }>("userId");

    for (const remedy of expiredPausedRemedies) {
      console.log(
        `[RemedyScheduler] ▶️ Reanudando automáticamente ${remedy.name} (período de pausa cumplido)`,
      );
      remedy.isActive = true;
      remedy.pausedUntil = null;
      remedy.pauseReason = undefined;

      if (new Date(remedy.nextDoseAt) <= now) {
        remedy.nextDoseAt = now;
      }

      remedy.reminderState = {
        status: "pending",
        snoozeCount: 0,
      };
      await remedy.save();

      await RemedyLog.create({
        userId: remedy.userId?._id || remedy.userId,
        remedyId: remedy._id,
        remedyName: remedy.name,
        scheduledFor: remedy.nextDoseAt,
        action: "resumed",
        actionAt: now,
        skipReason: "Reanudación automática al finalizar período de pausa",
      });

      if (remedy.userId?.telegramChatId) {
        try {
          await sendTelegramTextMessage(
            remedy.userId.telegramChatId,
            `▶️ <b>MEDICACIÓN REANUDADA AUTOMÁTICAMENTE</b>\n\n` +
              `El período de pausa para <b>${remedy.name}</b> ha finalizado. Los recordatorios vuelven a estar activos.`,
          );
        } catch (err) {
          console.error("[RemedyScheduler] Error enviando aviso de reanudación:", err);
        }
      }
    }

    // Query active remedies
    const remedies = await Remedy.find({ isActive: true }).populate<{
      userId: UserDocument;
    }>("userId");

    for (const remedy of remedies) {
      const user = remedy.userId;
      if (!user || !user.telegramChatId) {
        // User has no linked Telegram chat ID, skip Telegram alert
        continue;
      }

      const chatId = user.telegramChatId;
      const status = remedy.reminderState?.status || "pending";
      const nextDoseAt = new Date(remedy.nextDoseAt);
      const snoozeMinutes = remedy.snoozeMinutes || user.defaultSnoozeMinutes || 15;
      const lastSentAt = remedy.reminderState?.lastSentAt
        ? new Date(remedy.reminderState.lastSentAt)
        : null;
      const snoozedUntil = remedy.reminderState?.snoozedUntil
        ? new Date(remedy.reminderState.snoozedUntil)
        : null;

      // 1. Initial Scheduled Dose Time Arrived
      if (status === "pending" && nextDoseAt <= now) {
        console.log(
          `[RemedyScheduler] Enviando recordatorio para ${remedy.name} a usuario ${user.username}`,
        );

        const messageId = await sendMedicationReminder(
          chatId,
          remedy._id.toString(),
          remedy.name,
          remedy.dose,
          remedy.instructions,
          snoozeMinutes,
        );

        remedy.reminderState = {
          status: "sent",
          lastSentAt: now,
          snoozeCount: 0,
          lastTelegramMessageId: messageId || undefined,
        };
        await remedy.save();
        continue;
      }

      // 2. Snoozed Reminder Time Arrived
      if (status === "snoozed" && snoozedUntil && snoozedUntil <= now) {
        console.log(
          `[RemedyScheduler] Enviando recordatorio pospuesto (snooze) para ${remedy.name}`,
        );

        const messageId = await sendRepeatReminder(
          chatId,
          remedy._id.toString(),
          remedy.name,
          remedy.dose,
          snoozeMinutes,
        );

        remedy.reminderState = {
          status: "sent",
          lastSentAt: now,
          snoozeCount: (remedy.reminderState.snoozeCount || 0) + 1,
          lastTelegramMessageId: messageId || undefined,
        };
        await remedy.save();
        continue;
      }

      // 3. Ignored Reminder (No response after snoozeMinutes) -> Auto-repeat
      if (status === "sent" && lastSentAt) {
        const diffMs = now.getTime() - lastSentAt.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes >= snoozeMinutes) {
          console.log(
            `[RemedyScheduler] Recordatorio ignorado hace ${diffMinutes} min. Re-enviando alerta para ${remedy.name}`,
          );

          const messageId = await sendRepeatReminder(
            chatId,
            remedy._id.toString(),
            remedy.name,
            remedy.dose,
            snoozeMinutes,
          );

          remedy.reminderState = {
            ...remedy.reminderState,
            status: "sent",
            lastSentAt: now,
            snoozeCount: (remedy.reminderState.snoozeCount || 0) + 1,
            lastTelegramMessageId: messageId || undefined,
          };
          await remedy.save();
        }
      }
    }
  } catch (error) {
    console.error("[RemedyScheduler] Error al procesar recordatorios:", error);
  }
}
