import { Request, Response } from "express";
import Activity, {
  ActivityDocument,
  ActivityFrequency,
  ActivitySchedule,
} from "../models/Activity";
import ActivityLog from "../models/ActivityLog";

const DEFAULT_TIME = "09:00";
const DAY_MS = 24 * 60 * 60 * 1000;

function parseTime(value?: string): { hours: number; minutes: number } {
  const fallback = DEFAULT_TIME;
  const [hours, minutes] = (value || fallback).split(":").map(Number);
  if (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  ) {
    return { hours, minutes };
  }
  return { hours: 9, minutes: 0 };
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: unknown, fallback = new Date()): Date {
  if (!value) return fallback;
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  return Array.from(
    new Set(
      days
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ).sort((a, b) => a - b);
}

function matchesScheduleDate(schedule: ActivitySchedule, date: Date): boolean {
  const dayStart = startOfDay(date);
  const startDate = startOfDay(new Date(schedule.startDate));
  const endDate = schedule.endDate ? startOfDay(new Date(schedule.endDate)) : null;

  if (dayStart < startDate) return false;
  if (endDate && dayStart > endDate) return false;

  const dayOfWeek = dayStart.getDay();
  const days = schedule.daysOfWeek || [];

  switch (schedule.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "weekly":
      return days.length > 0 ? days.includes(dayOfWeek) : dayOfWeek === startDate.getDay();
    case "custom_days":
      return days.includes(dayOfWeek);
    case "monthly":
      return dayStart.getDate() === startDate.getDate();
    case "interval_days": {
      const diffDays = Math.floor((dayStart.getTime() - startDate.getTime()) / DAY_MS);
      const interval = Math.max(1, Number(schedule.intervalDays || 1));
      return diffDays >= 0 && diffDays % interval === 0;
    }
    default:
      return false;
  }
}

function calculateOccurrenceForDate(schedule: ActivitySchedule, date: Date): Date {
  const { hours, minutes } = parseTime(
    schedule.expectedStartTime || schedule.timeOfDay,
  );
  const occurrence = new Date(date);
  occurrence.setHours(hours, minutes, 0, 0);
  return occurrence;
}

function calculateNextOccurrence(
  schedule: ActivitySchedule,
  fromDate = new Date(),
): Date | null {
  const cursor = startOfDay(fromDate);

  for (let offset = 0; offset <= 370; offset += 1) {
    const candidateDay = new Date(cursor);
    candidateDay.setDate(cursor.getDate() + offset);

    if (!matchesScheduleDate(schedule, candidateDay)) continue;

    const occurrence = calculateOccurrenceForDate(schedule, candidateDay);
    if (occurrence > fromDate) return occurrence;
  }

  return null;
}

function normalizeSchedule(input: any, current?: ActivitySchedule): ActivitySchedule {
  const frequency = (input?.frequency || current?.frequency || "daily") as ActivityFrequency;
  const startDate = parseDateInput(input?.startDate, current?.startDate || new Date());
  const endDate =
    input?.endDate === "" || input?.endDate === null
      ? null
      : input?.endDate
        ? parseDateInput(input.endDate)
        : current?.endDate || null;

  const daysOfWeek = normalizeDays(input?.daysOfWeek ?? current?.daysOfWeek);
  const intervalDays = Math.max(1, Number(input?.intervalDays || current?.intervalDays || 1));

  return {
    frequency,
    daysOfWeek,
    intervalDays,
    startDate,
    endDate,
    timeOfDay: input?.timeOfDay ?? current?.timeOfDay ?? DEFAULT_TIME,
    expectedStartTime:
      input?.expectedStartTime ?? current?.expectedStartTime ?? input?.timeOfDay ?? current?.timeOfDay ?? DEFAULT_TIME,
    expectedEndTime: input?.expectedEndTime ?? current?.expectedEndTime ?? undefined,
  };
}

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

async function findUserActivity(id: string, userId?: string) {
  return Activity.findOne({ _id: id, userId });
}

async function advanceActivity(activity: ActivityDocument) {
  activity.nextOccurrenceAt = calculateNextOccurrence(activity.schedule, new Date());
  await activity.save();
}

export const getActivities = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const activities = await Activity.find({ userId }).sort({
    isActive: -1,
    nextOccurrenceAt: 1,
    title: 1,
  });

  return res.json({ success: true, activities });
};

export const createActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { title, description, category, trackingMode, schedule } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({
      success: false,
      error: "El nombre de la actividad es requerido.",
    });
  }

  const normalizedSchedule = normalizeSchedule(schedule);
  const activity = await Activity.create({
    userId,
    title: String(title).trim(),
    description: description || "",
    category: category || "personal",
    trackingMode: trackingMode || "completion",
    schedule: normalizedSchedule,
    nextOccurrenceAt: calculateNextOccurrence(normalizedSchedule, new Date()),
    isActive: true,
  });

  return res.status(201).json({ success: true, activity });
};

export const updateActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);

  const activity = await findUserActivity(id, userId);
  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  const { title, description, category, trackingMode, schedule, isActive } = req.body;

  if (title !== undefined) {
    if (!String(title).trim()) {
      return res.status(400).json({ success: false, error: "El nombre no puede quedar vacío." });
    }
    activity.title = String(title).trim();
  }
  if (description !== undefined) activity.description = description;
  if (category !== undefined) activity.category = category;
  if (trackingMode !== undefined) activity.trackingMode = trackingMode;
  if (isActive !== undefined) activity.isActive = Boolean(isActive);
  if (schedule !== undefined) activity.schedule = normalizeSchedule(schedule, activity.schedule);

  activity.nextOccurrenceAt = activity.isActive
    ? calculateNextOccurrence(activity.schedule, new Date())
    : null;

  await activity.save();
  return res.json({ success: true, activity });
};

export const deleteActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);

  const activity = await Activity.findOneAndDelete({ _id: id, userId });
  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  return res.json({ success: true, message: "Actividad eliminada correctamente" });
};

export const getActivityLogs = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const limit = Math.min(Number(req.query.limit) || 100, 300);
  const logs = await ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);

  return res.json({ success: true, logs });
};

export const completeActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);
  const { note, targetDate } = req.body;
  const now = new Date();
  const activity = await findUserActivity(id, userId);

  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  const logDate = parseDateInput(targetDate, now);
  const dateKey = toDateKey(logDate);
  const scheduledFor = calculateOccurrenceForDate(activity.schedule, logDate);

  const log = await ActivityLog.create({
    userId,
    activityId: activity._id,
    activityTitle: activity.title,
    dateKey,
    scheduledFor,
    status: "completed",
    completedAt: now,
    note: note || undefined,
  });

  await advanceActivity(activity);

  return res.json({
    success: true,
    message: "Actividad completada",
    activity,
    log,
  });
};

export const checkInActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);
  const { note, targetDate } = req.body;
  const now = new Date();
  const activity = await findUserActivity(id, userId);

  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  const logDate = parseDateInput(targetDate, now);
  const dateKey = toDateKey(logDate);
  const scheduledFor = calculateOccurrenceForDate(activity.schedule, logDate);

  const existingOpenLog = await ActivityLog.findOne({
    userId,
    activityId: activity._id,
    status: "in_progress",
    checkOutAt: { $exists: false },
  }).sort({ checkInAt: -1 });

  if (existingOpenLog) {
    return res.status(400).json({
      success: false,
      error: "Ya existe una entrada activa para esta actividad.",
    });
  }

  const log = await ActivityLog.create({
    userId,
    activityId: activity._id,
    activityTitle: activity.title,
    dateKey,
    scheduledFor,
    status: "in_progress",
    checkInAt: now,
    note: note || undefined,
  });

  return res.json({
    success: true,
    message: "Entrada registrada",
    activity,
    log,
  });
};

export const checkOutActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);
  const { note } = req.body;
  const now = new Date();
  const activity = await findUserActivity(id, userId);

  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  const log = await ActivityLog.findOne({
    userId,
    activityId: activity._id,
    status: "in_progress",
    checkOutAt: { $exists: false },
  }).sort({ checkInAt: -1 });

  if (!log || !log.checkInAt) {
    return res.status(400).json({
      success: false,
      error: "No hay una entrada activa para cerrar.",
    });
  }

  log.checkOutAt = now;
  log.status = "completed";
  log.completedAt = now;
  log.durationMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(log.checkInAt).getTime()) / 60000),
  );
  if (note !== undefined) log.note = note;
  await log.save();

  await advanceActivity(activity);

  return res.json({
    success: true,
    message: "Salida registrada",
    activity,
    log,
  });
};

export const skipActivity = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = getParamId(req);
  const { reason, targetDate } = req.body;
  const now = new Date();
  const activity = await findUserActivity(id, userId);

  if (!activity) {
    return res.status(404).json({ success: false, error: "Actividad no encontrada" });
  }

  const logDate = parseDateInput(targetDate, now);
  const dateKey = toDateKey(logDate);
  const scheduledFor = calculateOccurrenceForDate(activity.schedule, logDate);

  const log = await ActivityLog.create({
    userId,
    activityId: activity._id,
    activityTitle: activity.title,
    dateKey,
    scheduledFor,
    status: "skipped",
    completedAt: now,
    skipReason: reason || "Sin motivo especificado",
  });

  await advanceActivity(activity);

  return res.json({
    success: true,
    message: "Actividad omitida",
    activity,
    log,
  });
};
