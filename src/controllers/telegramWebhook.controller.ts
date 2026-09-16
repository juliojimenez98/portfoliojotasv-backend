import { Request, Response } from "express";
import User from "../models/User";
import Remedy from "../models/Remedy";
import RemedyLog from "../models/RemedyLog";
import {
  answerCallbackQuery,
  editTelegramMessage,
  sendSkipReasonOptions,
  sendPauseDurationOptions,
  sendTelegramTextMessage,
} from "../services/telegramService";

function calculateNextDose(currentScheduled: Date, frequencyHours: number): Date {
  const now = new Date();
  let next = new Date(currentScheduled);
  if (isNaN(next.getTime())) {
    next = new Date();
  }

  while (next <= now) {
    next = new Date(next.getTime() + frequencyHours * 60 * 60 * 1000);
  }
  return next;
}

export const processTelegramUpdate = async (update: any) => {
  try {
    if (!update) return;

    // 1. Process Telegram text messages (e.g. /start <code>)
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id.toString();
      const text = update.message.text.trim();
      console.log(`[Telegram] 📩 Mensaje recibido de chat ${chatId}: "${text}"`);

      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const code = parts[1]?.trim().toUpperCase();

        if (!code) {
          await sendTelegramTextMessage(
            chatId,
            `👋 <b>¡Hola!</b> Para vincular tu cuenta con la app de remedios, por favor ingresa a la aplicación web y genera un enlace de vinculación.`,
          );
          return;
        }

        const user = await User.findOne({
          telegramLinkCode: code,
          telegramLinkExpires: { $gt: new Date() },
        });

        if (!user) {
          console.warn(`[Telegram] ⚠️ Código ${code} no encontrado o expirado para chat ${chatId}`);
          await sendTelegramTextMessage(
            chatId,
            `❌ <b>Código inválido o expirado.</b>\nPor favor vuelve a presionar 'Vincular Telegram' en la app web para obtener un nuevo código.`,
          );
          return;
        }

        user.telegramChatId = chatId;
        user.telegramLinkCode = undefined;
        user.telegramLinkExpires = undefined;
        await user.save();

        console.log(`[Telegram] 🎉 Usuario '${user.username}' vinculado exitosamente con chat ID: ${chatId}`);

        await sendTelegramTextMessage(
          chatId,
          `✅ <b>¡Cuenta vinculada con éxito!</b>\nHola <b>${user.username}</b>, a partir de ahora recibirás aquí las alertas de tus remedios.`,
        );
        return;
      }
    }

    // 2. Process Callback Queries (Buttons)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackQueryId = callbackQuery.id;
      const callbackData = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id.toString();
      const messageId = callbackQuery.message.message_id;

      if (!callbackData) return;

      const [actionType, remedyId, ...extra] = callbackData.split(":");

      const remedy = await Remedy.findById(remedyId);
      if (!remedy) {
        await answerCallbackQuery(
          callbackQueryId,
          "Este remedio ya no existe o fue eliminado.",
        );
        await editTelegramMessage(
          chatId,
          messageId,
          `⚠️ <i>Este remedio ya no está disponible en la app.</i>`,
        );
        return;
      }

      const scheduledFor = remedy.nextDoseAt;

      // ACTION: TAKEN
      if (actionType === "taken") {
        remedy.nextDoseAt = calculateNextDose(remedy.nextDoseAt, remedy.frequencyHours);
        remedy.reminderState = {
          status: "pending",
          snoozeCount: 0,
        };
        await remedy.save();

        await RemedyLog.create({
          userId: remedy.userId,
          remedyId: remedy._id,
          remedyName: remedy.name,
          scheduledFor,
          action: "taken",
          actionAt: new Date(),
        });

        const formattedNext = remedy.nextDoseAt.toLocaleString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        await editTelegramMessage(
          chatId,
          messageId,
          `✅ <b>REMEDIO REGISTRADO COMO TOMADO</b>\n\n` +
            `• <b>Remedio:</b> ${remedy.name}\n` +
            `• <b>Dosis:</b> ${remedy.dose}\n` +
            `• <b>Próxima dosis:</b> ${formattedNext}`,
        );

        await answerCallbackQuery(callbackQueryId, "✅ Dosis registrada como tomada");
        return;
      }

      // ACTION: SNOOZE
      if (actionType === "snooze") {
        const user = await User.findById(remedy.userId);
        const snoozeMinutes = remedy.snoozeMinutes || user?.defaultSnoozeMinutes || 15;
        const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

        remedy.reminderState = {
          status: "snoozed",
          snoozedUntil,
          snoozeCount: (remedy.reminderState?.snoozeCount || 0) + 1,
          lastTelegramMessageId: messageId,
        };
        await remedy.save();

        await RemedyLog.create({
          userId: remedy.userId,
          remedyId: remedy._id,
          remedyName: remedy.name,
          scheduledFor,
          action: "snoozed",
          actionAt: new Date(),
        });

        await editTelegramMessage(
          chatId,
          messageId,
          `⏰ <b>RECORDATORIO POSPUESTO</b>\n\n` +
            `• <b>Remedio:</b> ${remedy.name}\n` +
            `• <b>Te volveremos a recordar en:</b> ${snoozeMinutes} minutos`,
        );

        await answerCallbackQuery(
          callbackQueryId,
          `⏰ Pospuesto por ${snoozeMinutes} min`,
        );
        return;
      }

      // ACTION: SKIP ASK (Show reason selection)
      if (actionType === "skip_ask") {
        await sendSkipReasonOptions(chatId, messageId, remedyId);
        await answerCallbackQuery(callbackQueryId);
        return;
      }

      // ACTION: SKIP REASON SELECTED
      if (actionType === "skip_reason") {
        const reason = extra.join(":") || "No se puede tomar hoy";

        remedy.nextDoseAt = calculateNextDose(remedy.nextDoseAt, remedy.frequencyHours);
        remedy.reminderState = {
          status: "pending",
          snoozeCount: 0,
        };
        await remedy.save();

        await RemedyLog.create({
          userId: remedy.userId,
          remedyId: remedy._id,
          remedyName: remedy.name,
          scheduledFor,
          action: "skipped",
          actionAt: new Date(),
          skipReason: reason,
        });

        const formattedNext = remedy.nextDoseAt.toLocaleString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        await editTelegramMessage(
          chatId,
          messageId,
          `❌ <b>DOSIS OMITIDA HOY</b>\n\n` +
            `• <b>Remedio:</b> ${remedy.name}\n` +
            `• <b>Motivo:</b> <i>${reason}</i>\n` +
            `• <b>Próxima dosis:</b> ${formattedNext}`,
        );

        await answerCallbackQuery(callbackQueryId, "Dosis omitida registrada");
        return;
      }

      // ACTION: PAUSE ASK (Show duration options)
      if (actionType === "pause_ask") {
        await sendPauseDurationOptions(chatId, messageId, remedyId, remedy.name);
        await answerCallbackQuery(callbackQueryId);
        return;
      }

      // ACTION: PAUSE CANCEL (Return to normal reminder view)
      if (actionType === "pause_cancel") {
        const user = await User.findById(remedy.userId);
        const snoozeMinutes = remedy.snoozeMinutes || user?.defaultSnoozeMinutes || 15;
        await answerCallbackQuery(callbackQueryId, "Pausa cancelada");
        await editTelegramMessage(
          chatId,
          messageId,
          `💊 <b>RECORDATORIO DE REMEDIO</b>\n\n` +
            `• <b>Nombre:</b> ${remedy.name}\n` +
            `• <b>Dosis:</b> <code>${remedy.dose}</code>\n` +
            (remedy.instructions ? `• <b>Notas:</b> ${remedy.instructions}\n` : "") +
            `\n¿Qué deseas hacer?`,
        );
        return;
      }

      // ACTION: PAUSE DURATION SELECTED
      if (actionType === "pause_duration") {
        const durationType = extra[0] || "indefinite";
        const now = new Date();
        let pausedUntil: Date | null = null;
        let periodLabel = "indefinidamente";

        if (durationType === "1d") {
          pausedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          periodLabel = `hasta el ${pausedUntil.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
        } else if (durationType === "3d") {
          pausedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          periodLabel = `por 3 días (hasta el ${pausedUntil.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})`;
        } else if (durationType === "7d") {
          pausedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          periodLabel = `por 1 semana (hasta el ${pausedUntil.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})`;
        }

        remedy.isActive = false;
        remedy.pausedUntil = pausedUntil;
        remedy.pauseReason = `Pausado desde Telegram (${periodLabel})`;
        remedy.reminderState = {
          status: "pending",
          snoozeCount: 0,
        };
        await remedy.save();

        await RemedyLog.create({
          userId: remedy.userId,
          remedyId: remedy._id,
          remedyName: remedy.name,
          scheduledFor: scheduledFor || now,
          action: "paused",
          actionAt: now,
          skipReason: `Pausado ${periodLabel}`,
        });

        await editTelegramMessage(
          chatId,
          messageId,
          `⏸️ <b>MEDICACIÓN PAUSADA</b>\n\n` +
            `• <b>Remedio:</b> ${remedy.name}\n` +
            `• <b>Estado:</b> Pausado ${periodLabel}.\n\n` +
            `<i>Los recordatorios no se enviarán durante este período. Puedes reactivarla en cualquier momento desde la web.</i>`,
        );

        await answerCallbackQuery(callbackQueryId, `Medicación pausada ${periodLabel}`);
        return;
      }
    }
  } catch (error) {
    console.error("[TelegramWebhook] Error al procesar update:", error);
  }
};

export const handleTelegramWebhook = async (req: Request, res: Response) => {
  res.status(200).send("OK");
  if (req.body) {
    await processTelegramUpdate(req.body);
  }
};

