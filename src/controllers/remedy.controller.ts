import { Request, Response } from "express";
import crypto from "crypto";
import Remedy from "../models/Remedy";
import RemedyLog from "../models/RemedyLog";
import User from "../models/User";
import { editTelegramMessage } from "../services/telegramService";

/**
 * Utility: Calculate next dose time given frequency in hours.
 */
function calculateNextDose(currentScheduled: Date, frequencyHours: number): Date {
  const now = new Date();
  let next = new Date(currentScheduled);
  if (isNaN(next.getTime())) {
    next = new Date();
  }

  // Add frequency intervals until next dose is in the future
  while (next <= now) {
    next = new Date(next.getTime() + frequencyHours * 60 * 60 * 1000);
  }
  return next;
}

export const getRemedies = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const remedies = await Remedy.find({ userId }).sort({ nextDoseAt: 1 });
  return res.json({ success: true, remedies });
};

export const createRemedy = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const {
    name,
    dose,
    instructions,
    frequencyHours,
    firstDoseTime,
    snoozeMinutes,
  } = req.body;

  if (!name || !dose || !frequencyHours) {
    return res.status(400).json({
      success: false,
      error: "Nombre, dosis y frecuencia son requeridos.",
    });
  }

  let nextDoseAt: Date;
  if (firstDoseTime) {
    nextDoseAt = new Date(firstDoseTime);
    if (isNaN(nextDoseAt.getTime())) {
      nextDoseAt = new Date();
    }
  } else {
    nextDoseAt = new Date();
  }

  // If firstDoseTime is in the past, align to future interval
  if (nextDoseAt <= new Date()) {
    nextDoseAt = calculateNextDose(nextDoseAt, Number(frequencyHours));
  }

  const user = await User.findById(userId);
  const defaultSnooze = user?.defaultSnoozeMinutes || 15;

  const remedy = await Remedy.create({
    userId,
    name,
    dose,
    instructions: instructions || "",
    frequencyHours: Number(frequencyHours),
    nextDoseAt,
    snoozeMinutes: snoozeMinutes ? Number(snoozeMinutes) : defaultSnooze,
    isActive: true,
    reminderState: {
      status: "pending",
      snoozeCount: 0,
    },
  });

  return res.status(201).json({ success: true, remedy });
};

export const updateRemedy = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const {
    name,
    dose,
    instructions,
    frequencyHours,
    nextDoseAt,
    snoozeMinutes,
    isActive,
    pausedUntil,
    pauseReason,
  } = req.body;

  const remedy = await Remedy.findOne({ _id: id, userId });
  if (!remedy) {
    return res.status(404).json({ success: false, error: "Remedio no encontrado" });
  }

  if (name !== undefined) remedy.name = name;
  if (dose !== undefined) remedy.dose = dose;
  if (instructions !== undefined) remedy.instructions = instructions;
  if (frequencyHours !== undefined) remedy.frequencyHours = Number(frequencyHours);
  if (snoozeMinutes !== undefined) remedy.snoozeMinutes = Number(snoozeMinutes);
  if (isActive !== undefined) {
    remedy.isActive = Boolean(isActive);
    if (remedy.isActive) {
      remedy.pausedUntil = null;
      remedy.pauseReason = undefined;
    }
  }
  if (pausedUntil !== undefined) {
    if (pausedUntil === null || pausedUntil === "") {
      remedy.pausedUntil = null;
    } else {
      const parsed = new Date(pausedUntil);
      if (!isNaN(parsed.getTime())) remedy.pausedUntil = parsed;
    }
  }
  if (pauseReason !== undefined) remedy.pauseReason = pauseReason;

  if (nextDoseAt) {
    const parsedDate = new Date(nextDoseAt);
    if (!isNaN(parsedDate.getTime())) {
      remedy.nextDoseAt = parsedDate;
      remedy.reminderState = {
        status: "pending",
        snoozeCount: 0,
      };
    }
  }

  await remedy.save();
  return res.json({ success: true, remedy });
};

export const pauseRemedy = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { pausedUntil, reason } = req.body;

  const remedy = await Remedy.findOne({ _id: id, userId });
  if (!remedy) {
    return res.status(404).json({ success: false, error: "Remedio no encontrado" });
  }

  let parsedDate: Date | null = null;
  if (pausedUntil) {
    const d = new Date(pausedUntil);
    if (!isNaN(d.getTime())) {
      parsedDate = d;
    }
  }

  const defaultReason = parsedDate
    ? `Pausado hasta el ${parsedDate.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : "Pausado indefinidamente";

  remedy.isActive = false;
  remedy.pausedUntil = parsedDate;
  remedy.pauseReason = reason || defaultReason;
  remedy.reminderState = {
    status: "pending",
    snoozeCount: 0,
  };
  await remedy.save();

  await RemedyLog.create({
    userId,
    remedyId: remedy._id,
    remedyName: remedy.name,
    scheduledFor: remedy.nextDoseAt,
    action: "paused",
    actionAt: new Date(),
    skipReason: remedy.pauseReason,
  });

  return res.json({
    success: true,
    message: parsedDate
      ? `Medicación pausada hasta ${parsedDate.toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
      : "Medicación pausada indefinidamente",
    remedy,
  });
};

export const resumeRemedy = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { nextDoseAt } = req.body;

  const remedy = await Remedy.findOne({ _id: id, userId });
  if (!remedy) {
    return res.status(404).json({ success: false, error: "Remedio no encontrado" });
  }

  const now = new Date();
  remedy.isActive = true;
  remedy.pausedUntil = null;
  remedy.pauseReason = undefined;

  if (nextDoseAt) {
    const parsed = new Date(nextDoseAt);
    if (!isNaN(parsed.getTime())) {
      remedy.nextDoseAt = parsed;
    }
  } else if (new Date(remedy.nextDoseAt) <= now) {
    remedy.nextDoseAt = now;
  }

  remedy.reminderState = {
    status: "pending",
    snoozeCount: 0,
  };
  await remedy.save();

  await RemedyLog.create({
    userId,
    remedyId: remedy._id,
    remedyName: remedy.name,
    scheduledFor: remedy.nextDoseAt,
    action: "resumed",
    actionAt: now,
    skipReason: "Medicación reanudada manualmente",
  });

  return res.json({
    success: true,
    message: "Medicación reanudada con éxito",
    remedy,
  });
};

export const deleteRemedy = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  const remedy = await Remedy.findOneAndDelete({ _id: id, userId });
  if (!remedy) {
    return res.status(404).json({ success: false, error: "Remedio no encontrado" });
  }

  return res.json({ success: true, message: "Remedio eliminado correctamente" });
};

export const executeAction = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { action, skipReason, customSnoozeMinutes } = req.body; // action: 'taken' | 'snooze' | 'skipped'

  const remedy = await Remedy.findOne({ _id: id, userId });
  if (!remedy) {
    return res.status(404).json({ success: false, error: "Remedio no encontrado" });
  }

  const now = new Date();
  const scheduledFor = remedy.nextDoseAt;

  if (action === "taken") {
    // Calculate next dose
    remedy.nextDoseAt = calculateNextDose(remedy.nextDoseAt, remedy.frequencyHours);
    remedy.reminderState = {
      status: "pending",
      snoozeCount: 0,
    };
    await remedy.save();

    await RemedyLog.create({
      userId,
      remedyId: remedy._id,
      remedyName: remedy.name,
      scheduledFor,
      action: "taken",
      actionAt: now,
    });

    return res.json({
      success: true,
      message: "Dosis registrada como tomada",
      remedy,
    });
  }

  if (action === "snooze") {
    const minutes = customSnoozeMinutes
      ? Number(customSnoozeMinutes)
      : remedy.snoozeMinutes || 15;
    const snoozedUntil = new Date(now.getTime() + minutes * 60 * 1000);

    remedy.reminderState = {
      status: "snoozed",
      snoozedUntil,
      snoozeCount: (remedy.reminderState.snoozeCount || 0) + 1,
      lastSentAt: remedy.reminderState.lastSentAt,
      lastTelegramMessageId: remedy.reminderState.lastTelegramMessageId,
    };
    await remedy.save();

    await RemedyLog.create({
      userId,
      remedyId: remedy._id,
      remedyName: remedy.name,
      scheduledFor,
      action: "snoozed",
      actionAt: now,
    });

    return res.json({
      success: true,
      message: `Recordatorio pospuesto por ${minutes} minutos`,
      remedy,
    });
  }

  if (action === "skipped") {
    remedy.nextDoseAt = calculateNextDose(remedy.nextDoseAt, remedy.frequencyHours);
    remedy.reminderState = {
      status: "pending",
      snoozeCount: 0,
    };
    await remedy.save();

    await RemedyLog.create({
      userId,
      remedyId: remedy._id,
      remedyName: remedy.name,
      scheduledFor,
      action: "skipped",
      actionAt: now,
      skipReason: skipReason || "Sin razón especificada",
    });

    return res.json({
      success: true,
      message: "Dosis marcada como omitida",
      remedy,
    });
  }

  return res.status(400).json({ success: false, error: "Acción no válida" });
};

export const getLogs = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const logs = await RemedyLog.find({ userId })
    .sort({ actionAt: -1 })
    .limit(100);

  return res.json({ success: true, logs });
};

export const generateTelegramLinkCode = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }

  // Generate 6-char hex code
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  user.telegramLinkCode = code;
  user.telegramLinkExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 mins
  await user.save();

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "remedios_jotasvbot";
  const telegramLink = `https://t.me/${botUsername}?start=${code}`;

  return res.json({
    success: true,
    code,
    telegramLink,
    expiresAt: user.telegramLinkExpires,
  });
};

export const linkTelegramManual = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ success: false, error: "El Chat ID es requerido" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }

  user.telegramChatId = chatId.toString().trim();
  user.telegramLinkCode = undefined;
  user.telegramLinkExpires = undefined;
  await user.save();

  return res.json({
    success: true,
    message: "Telegram vinculado manualmente con éxito",
  });
};

export const getTelegramStatus = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }

  return res.json({
    success: true,
    isLinked: Boolean(user.telegramChatId),
    telegramChatId: user.telegramChatId || null,
    defaultSnoozeMinutes: user.defaultSnoozeMinutes || 15,
  });
};

export const unlinkTelegram = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }

  user.telegramChatId = undefined;
  user.telegramLinkCode = undefined;
  user.telegramLinkExpires = undefined;
  await user.save();

  return res.json({
    success: true,
    message: "Telegram desvinculado correctamente",
  });
};

