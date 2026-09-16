import https from "node:https";
import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

// Custom DNS lookup to ensure reliable connection to Telegram servers
const customLookup = (hostname: string, options: any, callback: any) => {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "object" ? options : {};
  if (hostname === "api.telegram.org") {
    if (opts.all) {
      return cb(null, [{ address: "149.154.167.220", family: 4 }]);
    }
    return cb(null, "149.154.167.220", 4);
  }
  return dns.lookup(hostname, options, callback);
};

const httpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
});

export function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendTelegramRequest(method: string, body: Record<string, any> = {}) {
  const token = getBotToken();
  if (!token) {
    console.warn("[TelegramService] TELEGRAM_BOT_TOKEN no está configurado.");
    return null;
  }

  const payload = JSON.stringify(body);

  return new Promise<any>((resolve) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${token}/${method}`,
        method: "POST",
        agent: httpsAgent,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            const data = JSON.parse(rawData);
            if (!data.ok) {
              console.error(`[TelegramService] Error en ${method}:`, data);
            }
            resolve(data);
          } catch (err) {
            console.error(`[TelegramService] Error parseando JSON en ${method}:`, err);
            resolve(null);
          }
        });
      },
    );

    req.on("error", (err) => {
      console.error(`[TelegramService] Error de red en ${method}:`, err);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

export async function sendMedicationReminder(
  chatId: string,
  remedyId: string,
  remedyName: string,
  dose: string,
  instructions?: string,
  snoozeMinutes: number = 15,
): Promise<number | null> {
  const text =
    `💊 <b>RECORDATORIO DE REMEDIO</b>\n\n` +
    `Es hora de tomar tu medicamento:\n` +
    `• <b>Nombre:</b> ${remedyName}\n` +
    `• <b>Dosis:</b> <code>${dose}</code>\n` +
    (instructions ? `• <b>Notas:</b> ${instructions}\n` : "") +
    `\n¿Qué deseas hacer?`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Tomado",
          callback_data: `taken:${remedyId}`,
        },
      ],
      [
        {
          text: `⏰ Recordar en ${snoozeMinutes} min`,
          callback_data: `snooze:${remedyId}`,
        },
      ],
      [
        {
          text: "❌ No puedo tomarlo hoy",
          callback_data: `skip_ask:${remedyId}`,
        },
      ],
      [
        {
          text: "⏸️ Pausar medicación",
          callback_data: `pause_ask:${remedyId}`,
        },
      ],
    ],
  };

  const res = await sendTelegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  return res?.result?.message_id || null;
}

export async function sendRepeatReminder(
  chatId: string,
  remedyId: string,
  remedyName: string,
  dose: string,
  snoozeMinutes: number = 15,
): Promise<number | null> {
  const text =
    `🔔 <b>¡ATENCIÓN! RECORDATORIO PENDIENTE</b>\n\n` +
    `Aún no has registrado la toma de:\n` +
    `• <b>${remedyName}</b> (<code>${dose}</code>)\n\n` +
    `Por favor confirma tu respuesta:`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Tomado",
          callback_data: `taken:${remedyId}`,
        },
      ],
      [
        {
          text: `⏰ Posponer ${snoozeMinutes} min`,
          callback_data: `snooze:${remedyId}`,
        },
      ],
      [
        {
          text: "❌ No puedo tomarlo hoy",
          callback_data: `skip_ask:${remedyId}`,
        },
      ],
      [
        {
          text: "⏸️ Pausar medicación",
          callback_data: `pause_ask:${remedyId}`,
        },
      ],
    ],
  };

  const res = await sendTelegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  return res?.result?.message_id || null;
}

export async function sendSkipReasonOptions(
  chatId: string,
  messageId: number,
  remedyId: string,
) {
  const text =
    `❌ <b>OMITIR DOSIS HOY</b>\n\n` +
    `Por favor selecciona la razón por la cual no puedes tomarte el remedio hoy:`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🤢 Me siento mal / Malestar",
          callback_data: `skip_reason:${remedyId}:Me siento mal`,
        },
      ],
      [
        {
          text: "📦 No tengo el medicamento",
          callback_data: `skip_reason:${remedyId}:Sin stock o a mano`,
        },
      ],
      [
        {
          text: "🩺 Indicación médica / Ayuno",
          callback_data: `skip_reason:${remedyId}:Indicacion medica`,
        },
      ],
      [
        {
          text: "✏️ Otra razón",
          callback_data: `skip_reason:${remedyId}:Otro motivo`,
        },
      ],
    ],
  };

  return sendTelegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function sendPauseDurationOptions(
  chatId: string,
  messageId: number,
  remedyId: string,
  remedyName: string,
) {
  const text =
    `⏸️ <b>PAUSAR MEDICACIÓN: ${remedyName}</b>\n\n` +
    `¿Por cuánto tiempo deseas pausar los recordatorios de este medicamento?`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "⏸️ 1 día (24 horas)",
          callback_data: `pause_duration:${remedyId}:1d`,
        },
      ],
      [
        {
          text: "⏸️ 3 días",
          callback_data: `pause_duration:${remedyId}:3d`,
        },
      ],
      [
        {
          text: "⏸️ 1 semana (7 días)",
          callback_data: `pause_duration:${remedyId}:7d`,
        },
      ],
      [
        {
          text: "⏸️ Indefinidamente (hasta reactivar en la web)",
          callback_data: `pause_duration:${remedyId}:indefinite`,
        },
      ],
      [
        {
          text: "⬅️ Cancelar / Volver",
          callback_data: `pause_cancel:${remedyId}`,
        },
      ],
    ],
  };

  return sendTelegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
) {
  return sendTelegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [] },
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
) {
  return sendTelegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || "",
  });
}

export async function sendTelegramTextMessage(chatId: string, text: string) {
  return sendTelegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}

let pollingOffset = 0;
let isPolling = false;

export async function startTelegramPolling(handler: (update: any) => Promise<void>) {
  const token = getBotToken();
  if (!token || isPolling) return;
  isPolling = true;

  console.log("[TelegramService] 🤖 Iniciando servicio Polling para Telegram Bot...");

  const poll = async () => {
    try {
      const res = await sendTelegramRequest("getUpdates", {
        offset: pollingOffset,
        timeout: 5,
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          pollingOffset = update.update_id + 1;
          await handler(update);
        }
      }
    } catch (error) {
      console.error("[TelegramService] Error en polling de Telegram:", error);
    } finally {
      setTimeout(poll, 1500);
    }
  };

  poll();
}
